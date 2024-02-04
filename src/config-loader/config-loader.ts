import type * as Express from 'express';
import type {
	AbstractSqlModel,
	Definition,
} from '@balena/abstract-sql-compiler';
import type { Database } from '../database-layer/db';
import type {
	AnyObject,
	Dictionary,
	RequiredField,
	Resolvable,
} from '../sbvr-api/common-types';

import {
	type Migration,
	type Migrations,
	defaultMigrationCategory,
	MigrationCategories,
	isSyncMigration,
	isAsyncMigration,
} from '../migrator/utils';

import * as fs from 'fs';
import _ from 'lodash';
import * as path from 'path';

import * as sbvrUtils from '../sbvr-api/sbvr-utils';

import * as permissions from '../sbvr-api/permissions';
import {
	getDefaultHandler,
	getUploaderMiddlware,
	type WebResourceHandler,
	setupUploadHooks,
	setupWebresourceHandler,
} from '../webresource-handler';
import type { AliasValidNodeType } from '../sbvr-api/translations';

export type SetupFunction = (
	app: Express.Application,
	sbvrUtilsInstance: typeof sbvrUtils,
	db: Database,
) => Resolvable<void>;

export interface Model {
	apiRoot?: string;
	modelName?: string;
	modelFile?: string;
	modelText?: string;
	abstractSql?: AbstractSqlModel;
	migrationsPath?: string;
	migrations?: Migrations;
	initSqlPath?: string;
	initSql?: string;
	customServerCode?:
		| string
		| {
				setup: SetupFunction;
		  };
	logging?: { [key in keyof Console | 'default']?: boolean };
	translateTo?: Model['apiRoot'];
	translations?: Dictionary<
		Definition | Dictionary<string | AliasValidNodeType>
	>;
}
export interface User {
	username: string;
	password: string;
	permissions?: string[];
}
export interface Config {
	models: Model[];
	users?: User[];
	webResourceHandler?: WebResourceHandler;
}

const getOrCreate = async (
	authApiTx: sbvrUtils.PinejsClient,
	resource: string,
	uniqueFields: AnyObject,
	extraFields?: AnyObject,
) => {
	const result = (await authApiTx.get({
		resource,
		id: uniqueFields,
		options: {
			$select: 'id',
		},
	})) as { id: number } | undefined;
	if (result != null) {
		return result.id;
	}
	const { id } = (await authApiTx.post({
		resource,
		body: { ...uniqueFields, ...extraFields },
		options: { returnResource: false },
	})) as { id: number };
	return id;
};

const getOrCreatePermission = async (
	authApiTx: sbvrUtils.PinejsClient,
	permissionName: string,
) => {
	try {
		return await getOrCreate(authApiTx, 'permission', { name: permissionName });
	} catch (e: any) {
		e.message = `Could not create or find permission "${permissionName}": ${e.message}`;
		throw e;
	}
};

// Setup function
export const setup = (app: Express.Application) => {
	const loadConfig = async (data: Config): Promise<void> => {
		await sbvrUtils.db.transaction(async (tx) => {
			const authApiTx = sbvrUtils.api.Auth.clone({
				passthrough: {
					tx,
					req: permissions.root,
				},
			});

			const { users } = data;
			if (users != null) {
				const permissionsCache: {
					[index: string]: Promise<number>;
				} = {};
				for (const user of users) {
					if (user.permissions == null) {
						continue;
					}
					for (const permissionName of user.permissions) {
						permissionsCache[permissionName] ??= getOrCreatePermission(
							authApiTx,
							permissionName,
						);
					}
				}

				await Promise.all(
					users.map(async (user) => {
						try {
							const userID = await getOrCreate(
								authApiTx,
								'user',
								{
									username: user.username,
								},
								{
									password: user.password,
								},
							);
							if (user.permissions != null) {
								await Promise.all(
									user.permissions.map(async (permissionName) => {
										const permissionID = await permissionsCache[permissionName];
										await getOrCreate(authApiTx, 'user__has__permission', {
											user: userID,
											permission: permissionID,
										});
									}),
								);
							}
						} catch (e: any) {
							e.message = `Could not create or find user "${user.username}": ${e.message}`;
							throw e;
						}
					}),
				);
			}

			const modelPromises: Dictionary<Promise<void>> = _(data.models)
				.filter(
					(model): model is RequiredField<typeof model, 'apiRoot'> =>
						(model.abstractSql != null || model.modelText != null) &&
						model.apiRoot != null,
				)
				.keyBy((model) => model.apiRoot)
				.mapValues(async (model: Model) => {
					try {
						const { translateTo, translations } = model;
						if (translateTo != null) {
							// We add an async boundary here so that `mapValues` can complete and assign the
							// waiting promises to `modelPromises` before we try to access it
							await null;
							if (modelPromises[translateTo] == null) {
								throw new Error(
									`Cannot translate to non-existent version '${translateTo}'`,
								);
							}
							// Wait on the `translateTo` version since it needs to already be available
							await modelPromises[translateTo];
						} else if (translations != null) {
							throw new Error(
								'Cannot have translations without a translateTo target',
							);
						}

						await sbvrUtils.executeModel(
							tx,
							model as sbvrUtils.ExecutableModel,
						);

						const apiRoute = `/${model.apiRoot}/*`;
						const webResourceHandler =
							data.webResourceHandler ?? getDefaultHandler();

						setupWebresourceHandler(webResourceHandler);
						const fileUploadMiddleware =
							getUploaderMiddlware(webResourceHandler);
						app
							.route(apiRoute)
							.options((_req, res) => res.status(200).end())
							.get(sbvrUtils.handleODataRequest)
							.put(sbvrUtils.handleODataRequest)
							.post(fileUploadMiddleware, sbvrUtils.handleODataRequest)
							.patch(fileUploadMiddleware, sbvrUtils.handleODataRequest)
							.merge(sbvrUtils.handleODataRequest)
							.delete(sbvrUtils.handleODataRequest);

						const loadedModel = sbvrUtils.getModel(model.apiRoot!);
						if (translateTo == null) {
							const resourceNames = Object.values(
								loadedModel.abstractSql.tables,
							)
								.filter((table) =>
									table.fields.some((f) => f.dataType === 'WebResource'),
								)
								.map((table) => table.name);

							for (const resource of new Set(resourceNames)) {
								setupUploadHooks(webResourceHandler, model.apiRoot!, resource);
							}
						}

						console.info(
							'Successfully executed ' + model.modelName + ' model.',
						);
					} catch (err: any) {
						const message = `Failed to execute '${model.modelName}' model from '${model.modelFile}'`;
						if (_.isError(err)) {
							err.message = `${message} due to: ${err.message}`;
							throw err;
						}
						throw new Error(message);
					}
				})
				.value();
			await Promise.all(Object.values(modelPromises));

			await Promise.all(
				data.models.map(async (model) => {
					if (model.customServerCode != null) {
						let customCode: SetupFunction;
						if (typeof model.customServerCode === 'string') {
							try {
								customCode = nodeRequire(model.customServerCode).setup;
							} catch (e: any) {
								e.message = `Error loading custom server code: '${e.message}'`;
								throw e;
							}
						} else if (typeof model.customServerCode === 'object') {
							customCode = model.customServerCode.setup;
						} else {
							throw new Error(
								`Invalid type for customServerCode '${typeof model.customServerCode}'`,
							);
						}

						if (typeof customCode !== 'function') {
							return;
						}

						await customCode(app, sbvrUtils, sbvrUtils.db);
					}
				}),
			);
		});
	};
	const loadConfigFile = async (configPath: string): Promise<Config> => {
		console.info('Loading config:', configPath);
		const { default: configObj } = await import(configPath);
		return configObj;
	};

	const loadApplicationConfig = async (config: string | Config | undefined) => {
		try {
			console.info('Loading application config');
			let root: string;
			let configObj: Config;
			if (config == null) {
				root = path.resolve(process.argv[2]) || __dirname;
				configObj = await loadConfigFile(path.join(root, 'config.json'));
			} else if (typeof config === 'string') {
				root = path.dirname(config);
				configObj = await loadConfigFile(config);
			} else if (typeof config === 'object') {
				root = process.cwd();
				configObj = config;
			} else {
				throw new Error(`Invalid type for config '${typeof config}'`);
			}
			const resolvePath = (s: string): string => {
				if (path.isAbsolute(s)) {
					return s;
				}
				return path.join(root, s);
			};

			await Promise.all(
				configObj.models.map(async (model) => {
					if (model.modelFile != null) {
						model.modelText = await fs.promises.readFile(
							resolvePath(model.modelFile),
							'utf8',
						);
					}
					if (typeof model.customServerCode === 'string') {
						model.customServerCode = resolvePath(model.customServerCode);
					}
					model.migrations ??= {};
					const { migrations } = model;

					if (model.migrationsPath) {
						const migrationsPath = resolvePath(model.migrationsPath);

						const fileNames = await fs.promises.readdir(migrationsPath);
						await Promise.all(
							fileNames.map(async (filename) => {
								const filePath = path.join(migrationsPath, filename);
								const fileNameParts = filename.split('.', 3);
								const fileExtension = path.extname(filename);
								const [migrationKey] = filename.split('-', 1);
								let migrationCategory = defaultMigrationCategory;

								if (fileNameParts.length === 3) {
									if (fileNameParts[1] in MigrationCategories) {
										migrationCategory = fileNameParts[1] as MigrationCategories;
									} else {
										console.error(
											`Unrecognized migration file category ${
												fileNameParts[1]
											}, skipping: ${path.extname(filename)}`,
										);
										return;
									}
								}

								/**
								 *  helper to assign migrations with category level to model
								 *  example migration file names:
								 *
								 *  key0-name.ts  				==> defaults startup migration
								 *  key1-name1.sql 				==> defaults startup migration
								 *  key2-name2.sync.sql 		==> explicit synchrony migration
								 *  key3-name3.async.ts			==> async migration (async datafiller)
								 *  key4-name4.async.sql		==> async migration (async datafiller)
								 *
								 */
								const assignMigrationWithCategory = (
									newMigrationKey: string,
									newMigration: Migration,
								) => {
									const catMigrations = migrations[migrationCategory] || {};
									if (
										typeof newMigration === 'object' &&
										migrationCategory === MigrationCategories.async
									) {
										newMigration.type = MigrationCategories.async;
									}
									if (typeof catMigrations === 'object') {
										migrations[migrationCategory] = {
											[newMigrationKey]: newMigration,
											...catMigrations,
										};
									}
								};

								switch (fileExtension) {
									case '.coffee':
									case '.ts':
									case '.js': {
										const { default: loadedMigration } = await import(filePath);
										const migration =
											// This second check for `.default` is because it might be a commonjs file that was compiled from typescript with `export default`
											// and typescript will add the `.default` but so will the `import()`
											loadedMigration.default ?? loadedMigration;

										if (
											!isAsyncMigration(migration) &&
											!isSyncMigration(migration)
										) {
											throw new Error(
												`loaded migraton file at ${filePath} is neither a synchron nor a asyncron migration definition`,
											);
										}

										assignMigrationWithCategory(migrationKey, migration);
										break;
									}
									case '.sql':
										if (migrationCategory === MigrationCategories.async) {
											console.error(
												`Plain async migration sql statement not supported, needs to be an object, skipping: ${path.extname(
													filename,
												)}`,
											);
											break;
										}
										assignMigrationWithCategory(
											migrationKey,
											await fs.promises.readFile(filePath, 'utf8'),
										);
										break;
									default:
										console.error(
											`Unrecognised migration file extension, skipping: ${path.extname(
												filename,
											)}`,
										);
								}
							}),
						);
					}
					if (model.initSqlPath) {
						const initSqlPath = resolvePath(model.initSqlPath);
						model.initSql = await fs.promises.readFile(initSqlPath, 'utf8');
					}
				}),
			);
			await loadConfig(configObj);
		} catch (err: any) {
			console.error('Error loading application config', err);
			process.exit(1);
		}
	};

	return {
		loadConfig,
		loadApplicationConfig,
	};
};

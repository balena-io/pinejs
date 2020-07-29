import type * as Express from 'express';
import type { AbstractSqlModel } from '@balena/abstract-sql-compiler';
import type { Database } from '../database-layer/db';
import type { Migration } from '../migrator/migrator';
import type { AnyObject, Resolvable } from '../sbvr-api/common-types';

import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';

import * as sbvrUtils from '../sbvr-api/sbvr-utils';

import * as permissions from '../sbvr-api/permissions';

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
	migrations?: {
		[index: string]: Migration;
	};
	initSqlPath?: string;
	initSql?: string;
	customServerCode?:
		| string
		| {
				setup: SetupFunction;
		  };
	logging?: { [key in keyof Console | 'default']?: boolean };
}
export interface User {
	username: string;
	password: string;
	permissions: string[];
}
export interface Config {
	models: Model[];
	users?: User[];
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
	})) as { id: number };
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
	} catch (e) {
		e.message = `Could not create or find permission "${permissionName}": ${e.message}`;
		throw e;
	}
};

// Setup function
export const setup = (app: Express.Application) => {
	const loadConfig = (data: Config): Promise<void> =>
		sbvrUtils.db.transaction(async (tx) => {
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
				users.forEach((user) => {
					if (user.permissions == null) {
						return;
					}
					user.permissions.forEach((permissionName) => {
						if (permissionsCache[permissionName] != null) {
							return;
						}
						permissionsCache[permissionName] = getOrCreatePermission(
							authApiTx,
							permissionName,
						);
					});
				});

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
						} catch (e) {
							e.message = `Could not create or find user "${user.username}": ${e.message}`;
							throw e;
						}
					}),
				);
			}

			await Promise.all(
				data.models.map(async (model) => {
					if (
						(model.abstractSql != null || model.modelText != null) &&
						model.apiRoot != null
					) {
						try {
							await sbvrUtils.executeModel(
								tx,
								model as sbvrUtils.ExecutableModel,
							);

							const apiRoute = `/${model.apiRoot}/*`;
							app.options(apiRoute, (_req, res) => res.sendStatus(200));
							app.all(apiRoute, sbvrUtils.handleODataRequest);

							console.info(
								'Successfully executed ' + model.modelName + ' model.',
							);
						} catch (err) {
							const message = `Failed to execute ${model.modelName} model from ${model.modelFile}`;
							if (_.isError(err)) {
								err.message = message;
								throw err;
							}
							throw new Error(message);
						}
					}
					if (model.customServerCode != null) {
						let customCode: SetupFunction;
						if (typeof model.customServerCode === 'string') {
							try {
								customCode = nodeRequire(model.customServerCode).setup;
							} catch (e) {
								e.message = `Error loading custom server code: '${e.message}'`;
								throw e;
							}
						} else if (_.isObject(model.customServerCode)) {
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

	const loadConfigFile = async (configPath: string): Promise<Config> => {
		console.info('Loading config:', configPath);
		return await import(configPath);
	};

	const loadApplicationConfig = async (config: string | Config | undefined) => {
		try {
			if (require.extensions['.coffee'] == null) {
				try {
					// Try to register the coffeescript loader if it doesn't exist
					// We ignore if it fails though, since that probably just means it is not available/needed.
					require('coffeescript/register');
				} catch (e) {
					// Ignore errors
				}
			}
			if (require.extensions['.ts'] == null) {
				try {
					require('ts-node/register/transpile-only');
				} catch (e) {
					// Ignore errors
				}
			}

			console.info('Loading application config');
			let root: string;
			let configObj: Config;
			if (config == null) {
				root = path.resolve(process.argv[2]) || __dirname;
				configObj = await loadConfigFile(path.join(root, 'config.json'));
			} else if (typeof config === 'string') {
				root = path.dirname(config);
				configObj = await loadConfigFile(config);
			} else if (_.isObject(config)) {
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
					if (model.migrations == null) {
						model.migrations = {};
					}
					const migrations = model.migrations;

					if (model.migrationsPath) {
						const migrationsPath = resolvePath(model.migrationsPath);
						delete model.migrationsPath;

						const fileNames = await fs.promises.readdir(migrationsPath);
						await Promise.all(
							fileNames.map(async (filename) => {
								const filePath = path.join(migrationsPath, filename);
								const [migrationKey] = filename.split('-', 1);

								switch (path.extname(filename)) {
									case '.coffee':
									case '.ts':
									case '.js':
										migrations[migrationKey] = nodeRequire(filePath);
										break;
									case '.sql':
										migrations[migrationKey] = await fs.promises.readFile(
											filePath,
											'utf8',
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
		} catch (err) {
			console.error('Error loading application config', err, err.stack);
			process.exit(1);
		}
	};

	return {
		loadConfig,
		loadApplicationConfig,
	};
};

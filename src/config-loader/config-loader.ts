import * as _express from 'express';

import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as path from 'path';
import * as fs from 'fs';

import { Database } from '../database-layer/db';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import * as permissions from '../sbvr-api/permissions';
import { Resolvable } from '../sbvr-api/common-types';
import { AbstractSqlModel } from '@resin/abstract-sql-compiler';
import { Migration } from '../migrator/migrator';

export interface SetupFunction {
	(
		app: _express.Application,
		sbvrUtilsInstance: typeof sbvrUtils,
		db: Database,
	): Resolvable<void>;
}

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

// Setup function
export const setup = (app: _express.Application) => {
	const loadConfig = (data: Config): Bluebird<void> =>
		sbvrUtils.db.transaction(async tx => {
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
				_.each(users, user => {
					if (user.permissions == null) {
						return;
					}
					_.each(user.permissions, permissionName => {
						if (permissionsCache[permissionName] != null) {
							return;
						}
						permissionsCache[permissionName] = (async () => {
							try {
								const result = (await authApiTx.get({
									resource: 'permission',
									options: {
										$select: 'id',
										$filter: {
											name: permissionName,
										},
									},
								})) as Array<{ id: number }>;
								if (result.length === 0) {
									const { id } = (await authApiTx.post({
										resource: 'permission',
										body: {
											name: permissionName,
										},
										options: { returnResource: false },
									})) as { id: number };
									return id;
								} else {
									return result[0].id;
								}
							} catch (e) {
								e.message = `Could not create or find permission "${permissionName}": ${e.message}`;
								throw e;
							}
						})();
					});
				});

				await Bluebird.map(users, async user => {
					try {
						const result = (await authApiTx.get({
							resource: 'user',
							options: {
								$select: 'id',
								$filter: {
									username: user.username,
								},
							},
						})) as Array<{ id: number }>;
						let userID: number = result[0].id;
						if (result.length === 0) {
							({ id: userID } = (await authApiTx.post({
								resource: 'user',
								body: {
									username: user.username,
									password: user.password,
								},
								options: { returnResource: false },
							})) as { id: number });
						}
						if (user.permissions != null) {
							await Bluebird.map(user.permissions, async permissionName => {
								const permissionID = await permissionsCache[permissionName];
								const result = (await authApiTx.get({
									resource: 'user__has__permission',
									options: {
										$select: 'id',
										$filter: {
											user: userID,
											permission: permissionID,
										},
									},
								})) as sbvrUtils.AnyObject[];

								if (result.length === 0) {
									await authApiTx.post({
										resource: 'user__has__permission',
										body: {
											user: userID,
											permission: permissionID,
										},
										options: { returnResource: false },
									});
								}
							});
						}
					} catch (e) {
						e.message = `Could not create or find user "${user.username}": ${e.message}`;
						throw e;
					}
				});
			}

			await Bluebird.map(data.models, async model => {
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
					if (_.isString(model.customServerCode)) {
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

					if (!_.isFunction(customCode)) {
						return;
					}

					return customCode(app, sbvrUtils, sbvrUtils.db);
				}
			});
		});

	const loadConfigFile = (path: string): Bluebird<Config> => {
		console.info('Loading config:', path);
		return Bluebird.resolve(import(path));
	};

	const loadApplicationConfig = Bluebird.method(
		async (config?: string | Config) => {
			try {
				if (require.extensions['.coffee'] == null) {
					try {
						// Try to register the coffeescript loader if it doesn't exist
						// We ignore if it fails though, since that probably just means it is not available/needed.
						require('coffeescript/register');
					} catch (e) {}
				}
				if (require.extensions['.ts'] == null) {
					try {
						require('ts-node/register/transpile-only');
					} catch (e) {}
				}

				console.info('Loading application config');
				let root: string;
				let configObj: Config;
				if (config == null) {
					root = path.resolve(process.argv[2]) || __dirname;
					configObj = await loadConfigFile(path.join(root, 'config.json'));
				} else if (_.isString(config)) {
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

				await Bluebird.map(configObj.models, async model => {
					if (model.modelFile != null) {
						model.modelText = await fs.promises.readFile(
							resolvePath(model.modelFile),
							'utf8',
						);
					}
					if (_.isString(model.customServerCode)) {
						model.customServerCode = resolvePath(model.customServerCode);
					}
					if (model.migrations == null) {
						model.migrations = {};
					}
					const migrations = model.migrations;

					if (model.migrationsPath) {
						const migrationsPath = resolvePath(model.migrationsPath);
						delete model.migrationsPath;

						await Bluebird.resolve(fs.promises.readdir(migrationsPath)).map(
							async filename => {
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
							},
						);
					}
					if (model.initSqlPath) {
						const initSqlPath = resolvePath(model.initSqlPath);
						model.initSql = await fs.promises.readFile(initSqlPath, 'utf8');
					}
				});
				await loadConfig(configObj);
			} catch (err) {
				console.error('Error loading application config', err, err.stack);
				process.exit(1);
			}
		},
	);

	return {
		loadConfig,
		loadApplicationConfig,
	};
};

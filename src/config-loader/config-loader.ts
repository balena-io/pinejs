import * as _express from 'express';

import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as path from 'path';
import * as fs from 'fs';
// We force the type to match the specific overloaded version we want, as promisify can only choose one :(
const readFileAsync = (Promise.promisify(fs.readFile) as any) as (
	filename: string,
	encoding: string,
) => Promise<string>;
const readdirAsync = Promise.promisify(fs.readdir);

import { Database } from '../database-layer/db';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import * as permissions from '../sbvr-api/permissions';
import { RequiredField, Resolvable } from '../sbvr-api/common-types';

export interface SetupFunction {
	(
		app: _express.Application,
		sbvrUtilsInstance: typeof sbvrUtils,
		db: Database,
		done?: (err?: any) => void,
	): Promise<void>;
	(
		app: _express.Application,
		sbvrUtilsInstance: typeof sbvrUtils,
		db: Database,
		done: (err?: any) => void,
	): void;
	(
		app: _express.Application,
		sbvrUtilsInstance: typeof sbvrUtils,
		db: Database,
		done?: (err?: any) => void,
	): Promise<void> | void;
}

export interface Model {
	apiRoot?: string;
	modelName?: string;
	modelFile?: string;
	modelText?: string;
	migrationsPath?: string;
	migrations?: {
		[index: string]: string;
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
	const loadConfig = (data: Config): Promise<void> =>
		sbvrUtils.db
			.transaction(tx =>
				Promise.try(() => {
					const authApiTx = sbvrUtils.api.Auth.clone({
						passthrough: {
							tx,
							req: permissions.root,
						},
					});

					if (data.users != null) {
						const permissionsCache: {
							[index: string]: Promise<number>;
						} = {};
						_.each(data.users, user => {
							if (user.permissions == null) {
								return;
							}
							_.each(user.permissions, permissionName => {
								if (permissionsCache[permissionName] != null) {
									return;
								}
								permissionsCache[permissionName] = authApiTx
									.get({
										resource: 'permission',
										options: {
											$select: 'id',
											$filter: {
												name: permissionName,
											},
										},
									})
									.then((result: sbvrUtils.AnyObject[]) => {
										if (result.length === 0)
											return authApiTx
												.post({
													resource: 'permission',
													body: {
														name: permissionName,
													},
													options: { returnResource: false },
												})
												.then(({ id }: sbvrUtils.AnyObject) => id);
										else {
											return result[0].id;
										}
									})
									.tapCatch(e => {
										e.message = `Could not create or find permission "${permissionName}": ${
											e.message
										}`;
									});
							});
						});

						return Promise.map(data.users, user => {
							return authApiTx
								.get({
									resource: 'user',
									options: {
										$select: 'id',
										$filter: {
											username: user.username,
										},
									},
								})
								.then<number>((result: sbvrUtils.AnyObject[]) => {
									if (result.length === 0)
										return authApiTx
											.post({
												resource: 'user',
												body: {
													username: user.username,
													password: user.password,
												},
												options: { returnResource: false },
											})
											.then(({ id }: sbvrUtils.AnyObject) => id);
									else {
										return result[0].id;
									}
								})
								.then(userID => {
									if (user.permissions != null) {
										return Promise.map(user.permissions, permissionName =>
											permissionsCache[permissionName].then(permissionID =>
												authApiTx
													.get({
														resource: 'user__has__permission',
														options: {
															$select: 'id',
															$filter: {
																user: userID,
																permission: permissionID,
															},
														},
													})
													.then((result: sbvrUtils.AnyObject[]) => {
														if (result.length === 0) {
															return authApiTx
																.post({
																	resource: 'user__has__permission',
																	body: {
																		user: userID,
																		permission: permissionID,
																	},
																	options: { returnResource: false },
																})
																.return();
														}
													}),
											),
										).return();
									}
								})
								.tapCatch(e => {
									e.message = `Could not create or find user "${
										user.username
									}": ${e.message}`;
								});
						}).return();
					}
				})
					.return(data.models)
					.map(model => {
						if (model.modelText != null && model.apiRoot != null) {
							return sbvrUtils
								.executeModel(tx, model as RequiredField<
									Model,
									'apiRoot' | 'modelText'
								>)
								.then(() => {
									console.info(
										'Successfully executed ' + model.modelName + ' model.',
									);
								})
								.catch(err => {
									const message = `Failed to execute ${
										model.modelName
									} model from ${model.modelFile}`;
									if (_.isError(err)) {
										err.message = message;
										throw err;
									}
									throw new Error(message);
								});
						}
					})
					.then(() =>
						Promise.map(data.models, model => {
							if (model.modelText != null && model.apiRoot != null) {
								const apiRoute = `/${model.apiRoot}/*`;
								app.options(apiRoute, (_req, res) => res.sendStatus(200));
								app.all(apiRoute, sbvrUtils.handleODataRequest);
							}

							if (model.customServerCode != null) {
								let customCode: SetupFunction;
								if (_.isString(model.customServerCode)) {
									try {
										customCode = nodeRequire(model.customServerCode).setup;
									} catch (e) {
										e.message = `Error loading custom server code: '${
											e.message
										}'`;
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

								return new Promise<void>((resolve, reject) => {
									const promise = customCode(
										app,
										sbvrUtils,
										sbvrUtils.db,
										err => {
											if (err) {
												reject(err);
											} else {
												resolve();
											}
										},
									);

									if (Promise.is(promise)) {
										resolve(promise);
									}
								});
							}
						}),
					),
			)
			.return();

	const loadConfigFile = (path: string): Promise<Config> => {
		console.info('Loading config:', path);
		return Promise.resolve(import(path));
	};

	const loadApplicationConfig = (config?: string | Config) => {
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
		let configPromise: Resolvable<Config>;
		if (config == null) {
			root = path.resolve(process.argv[2]) || __dirname;
			configPromise = loadConfigFile(path.join(root, 'config.json'));
		} else if (_.isString(config)) {
			root = path.dirname(config);
			configPromise = loadConfigFile(config);
		} else if (_.isObject(config)) {
			root = process.cwd();
			configPromise = config;
		} else {
			return Promise.reject(
				new Error(`Invalid type for config '${typeof config}'`),
			);
		}
		const resolvePath = (s: string): string => {
			if (path.isAbsolute(s)) {
				return s;
			}
			return path.join(root, s);
		};

		return Promise.resolve(configPromise)
			.then(configObj =>
				Promise.map(configObj.models, model =>
					Promise.try<string | undefined>(() => {
						if (model.modelFile != null) {
							return readFileAsync(resolvePath(model.modelFile), 'utf8');
						}
						return model.modelText;
					})
						.then(modelText => {
							model.modelText = modelText;
							if (_.isString(model.customServerCode)) {
								model.customServerCode = resolvePath(model.customServerCode);
							}
						})
						.then(() => {
							if (model.migrations == null) {
								model.migrations = {};
							}
							const migrations = model.migrations;

							if (model.migrationsPath) {
								const migrationsPath = resolvePath(model.migrationsPath);
								delete model.migrationsPath;

								return readdirAsync(migrationsPath)
									.map(filename => {
										const filePath = path.join(migrationsPath, filename);
										const migrationKey = filename.split('-')[0];

										switch (path.extname(filename)) {
											case '.coffee':
											case '.js':
												migrations[migrationKey] = nodeRequire(filePath);
												break;
											case '.sql':
												return readFileAsync(filePath, 'utf8').then(sql => {
													migrations[migrationKey] = sql;
												});
											default:
												console.error(
													`Unrecognised migration file extension, skipping: ${path.extname(
														filename,
													)}`,
												);
										}
									})
									.return();
							}
						})
						.then(() => {
							if (model.initSqlPath) {
								const initSqlPath = resolvePath(model.initSqlPath);
								return readFileAsync(initSqlPath, 'utf8').then(initSql => {
									model.initSql = initSql;
								});
							}
						}),
				).then(() => loadConfig(configObj)),
			)
			.catch(err => {
				console.error('Error loading application config', err, err.stack);
				process.exit(1);
				throw new Error('Unreachable');
			});
	};

	return {
		loadConfig,
		loadApplicationConfig,
	};
};

import type Express from 'express';

import './sbvr-loader.js';

import * as dbModule from '../database-layer/db.js';
import * as configLoader from '../config-loader/config-loader.js';
import * as migrator from '../migrator/sync.js';
import type * as migratorUtils from '../migrator/utils.js';
import * as tasks from '../tasks/index.js';

import * as sbvrUtils from '../sbvr-api/sbvr-utils.js';
import { PINEJS_ADVISORY_LOCK } from '../config-loader/env.js';

export * as dbModule from '../database-layer/db.js';
export { PinejsSessionStore } from '../pinejs-session-store/pinejs-session-store.js';
export { mountLoginRouter } from '../passport-pinejs/mount-login-router.js';
export * as sbvrUtils from '../sbvr-api/sbvr-utils.js';
export * as permissions from '../sbvr-api/permissions.js';
export * as errors from '../sbvr-api/errors.js';
export * as env from '../config-loader/env.js';
export * as types from '../sbvr-api/common-types.js';
export * as hooks from '../sbvr-api/hooks.js';
export * as tasks from '../tasks/index.js';
export * as webResourceHandler from '../webresource-handler/index.js';
export type { configLoader as ConfigLoader };
export type { migratorUtils as Migrator };

let envDatabaseOptions: dbModule.DatabaseOptions<string>;
if (dbModule.engines.websql != null) {
	envDatabaseOptions = {
		engine: 'websql',
		params: 'rulemotion',
	};
} else {
	let databaseURL: string;
	if (process.env.DATABASE_URL) {
		databaseURL = process.env.DATABASE_URL;
	} else if (dbModule.engines.postgres != null) {
		databaseURL = 'postgres://postgres:.@localhost:5432/postgres';
	} else if (dbModule.engines.mysql == null) {
		databaseURL = 'mysql://mysql:.@localhost:3306';
	} else {
		throw new Error('No supported database options available');
	}
	envDatabaseOptions = {
		engine: databaseURL.slice(0, databaseURL.indexOf(':')),
		params: databaseURL,
	};
}

export const init = async <T extends string>(
	app: Express.Application,
	config?: string | configLoader.Config,
	databaseOptions:
		| dbModule.DatabaseOptions<T>
		| typeof envDatabaseOptions = envDatabaseOptions,
): Promise<ReturnType<typeof configLoader.setup>> => {
	try {
		const db = dbModule.connect(databaseOptions);
		// register a pinejs unique lock namespace
		dbModule.registerTransactionLockNamespace(
			PINEJS_ADVISORY_LOCK.namespaceKey,
			PINEJS_ADVISORY_LOCK.namespaceId,
		);
		await sbvrUtils.setup(app, db);
		const cfgLoader = configLoader.setup(app);
		await cfgLoader.loadConfig(migrator.config);
		await cfgLoader.loadConfig(tasks.config);

		if (!process.env.CONFIG_LOADER_DISABLED) {
			await cfgLoader.loadApplicationConfig(config);
		}
		// Execute it after all other promises have resolved. Execution of promises is not neccessarily
		// guaranteed to be sequentially resolving them with Promise.all
		await sbvrUtils.postSetup(app, db);

		return cfgLoader;
	} catch (err: any) {
		console.error('Error initialising server', err);
		process.exit(1);
	}
};

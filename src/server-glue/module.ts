import type * as Express from 'express';

import './sbvr-loader';

import * as dbModule from '../database-layer/db';
import * as configLoader from '../config-loader/config-loader';
import * as migrator from '../migrator/sync';
import * as migratorUtils from '../migrator/utils';

import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import { PINEJS_ADVISORY_LOCK } from '../config-loader/env';
import { optionalVar } from '@balena/env-parsing';

export * as dbModule from '../database-layer/db';
export { PinejsSessionStore } from '../pinejs-session-store/pinejs-session-store';
export * as sbvrUtils from '../sbvr-api/sbvr-utils';
export * as permissions from '../sbvr-api/permissions';
export * as errors from '../sbvr-api/errors';
export * as env from '../config-loader/env';
export * as types from '../sbvr-api/common-types';
export * as hooks from '../sbvr-api/hooks';
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
	if (optionalVar('DATABASE_URL')) {
		databaseURL = optionalVar('DATABASE_URL', '');
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
		const cfgLoader = await configLoader.setup(app);
		await cfgLoader.loadConfig(migrator.config);

		const promises: Array<Promise<void>> = [];
		// cannot be replaced with env-parsing module as it's overwritten in webpack process with a text-match plugin.
		// needs to remain `process.env.SBVR_SERVER_ENABLED` as this is the string the plugin will search for.
		if (process.env.SBVR_SERVER_ENABLED) {
			const sbvrServer = await import('../data-server/sbvr-server');
			const transactions = require('../http-transactions/transactions');
			promises.push(cfgLoader.loadConfig(sbvrServer.config));
			promises.push(
				cfgLoader
					.loadConfig(transactions.config)
					.then(() => transactions.addModelHooks('data')),
			);
		}
		// cannot be replaced with env-parsing module as it's overwritten in webpack process with a text-match plugin.
		// needs to remain `process.env.CONFIG_LOADER_DISABLED` as this is the string the plugin will search for.
		if (!process.env.CONFIG_LOADER_DISABLED) {
			promises.push(cfgLoader.loadApplicationConfig(config));
		}
		await Promise.all(promises);

		return cfgLoader;
	} catch (err: any) {
		console.error('Error initialising server', err);
		process.exit(1);
	}
};

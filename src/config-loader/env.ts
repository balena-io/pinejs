const { PINEJS_DEBUG } = process.env;
if (![undefined, '', '0', '1'].includes(PINEJS_DEBUG)) {
	// TODO-MAJOR: Throw on invalid value
	console.warn(`Invalid value for PINEJS_DEBUG '${PINEJS_DEBUG}'`);
}
export const DEBUG = PINEJS_DEBUG === '1';

type CacheFnOpts<T extends (...args: any[]) => any> =
	| {
			primitive?: true;
			promise?: true;
			normalizer?: memoizeWeak.MemoizeWeakOptions<T>['normalizer'];
			weak: true;
	  }
	| {
			primitive?: true;
			promise?: true;
			normalizer?: memoize.Options<T>['normalizer'];
			weak?: undefined;
	  };
export type CacheFn = <T extends (...args: any[]) => any>(
	fn: T,
	opts?: CacheFnOpts<T>,
) => T;
export type CacheOpts =
	| {
			max?: number;
	  }
	| CacheFn
	| false;

export const cache = {
	permissionsLookup: {
		max: 5000,
	} as CacheOpts,
	parsePermissions: {
		max: 100000,
	} as CacheOpts,
	parseOData: {
		max: 100000,
	} as CacheOpts,
	odataToAbstractSql: {
		max: 10000,
	} as CacheOpts,
	abstractSqlCompiler: {
		max: 10000,
	} as CacheOpts,
	userPermissions: false as CacheOpts,
	apiKeyPermissions: false as CacheOpts,
	apiKeyActorId: false as CacheOpts,
};

import { boolVar } from '@balena/env-parsing';
import * as memoize from 'memoizee';
import memoizeWeak = require('memoizee/weak');
export const createCache = <T extends (...args: any[]) => any>(
	cacheName: keyof typeof cache,
	fn: T,
	// TODO: Mark this as optional once TS is able to infer the `normalizer` types
	// when the `weak` differentiating property is not provided.
	opts: CacheFnOpts<T>,
) => {
	const cacheOpts = cache[cacheName];
	if (cacheOpts === false) {
		return fn;
	}
	if (typeof cacheOpts === 'function') {
		return cacheOpts(fn, opts);
	}
	if (opts?.weak === true) {
		return memoizeWeak(fn, {
			...cacheOpts,
			...opts,
		});
	}
	return memoize(fn, {
		...cacheOpts,
		...opts,
	});
};

let timeoutMS: number;
if (process.env.TRANSACTION_TIMEOUT_MS) {
	timeoutMS = parseInt(process.env.TRANSACTION_TIMEOUT_MS, 10);
	if (Number.isNaN(timeoutMS) || timeoutMS <= 0) {
		throw new Error(
			`Invalid valid for TRANSACTION_TIMEOUT_MS: ${process.env.TRANSACTION_TIMEOUT_MS}`,
		);
	}
} else {
	timeoutMS = 10000;
}

export const db = {
	poolSize: 50,
	idleTimeoutMillis: 30000 as number | undefined,
	statementTimeout: undefined as number | undefined,
	queryTimeout: undefined as number | undefined,
	connectionTimeoutMillis: 30000 as number | undefined,
	keepAlive: true as boolean | undefined,
	rollbackTimeout: 30000,
	timeoutMS,
	maxUses: Infinity,
	maxLifetimeSeconds: 0,
	/**
	 * Check that queries in read-only TXs only contain `SELECT` statements, doing so adds a cost to each query
	 * in a read-only TX and is unnecessary if it is part of a read-only database transaction. The only time a
	 * writable transaction should be used with a read-only TX is during a read-only hook within a writable request
	 * and so should only be able to catch cases of hooks that are incorrectly marked as read-only
	 *
	 * Defaults to true when in DEBUG mode, false otherwise
	 */
	checkReadOnlyQueries: DEBUG,
};

export const PINEJS_ADVISORY_LOCK = {
	namespaceKey: 'pinejs_advisory_lock_namespace',
	namespaceId: -1,
};
// for better readability of logging
export const booleanToEnabledString = (input: boolean) =>
	input ? 'enabled' : 'disabled';

export const migrator = {
	lockTimeout: 5 * 60 * 1000,
	// Used to delay the failure on lock taking, to avoid spam taking
	lockFailDelay: 20 * 1000,
	asyncMigrationDefaultDelayMS: 1000,
	asyncMigrationDefaultBackoffDelayMS: 60000,
	asyncMigrationDefaultErrorThreshold: 10,
	asyncMigrationDefaultBatchSize: 1000,

	/**
	 * @param asyncMigrationIsEnabled Switch on/off the execution of async migrations
	 * Example implementation with listening on SIGUSR2 to toggle the AsyncMigrationExecution enable switch
	 * For runtime switching the async migration execution the SIGUSR2 signal is interpreted as toggle.
	 * When the process receives a SIGUSR2 signal the async migrations will toggle to be enabled or disabled.
	 * @example
	 * process.on('SIGUSR2', () => {
	 * 	console.info(
	 * 		`Received SIGUSR2 to toggle async migration execution enabled
	 * 					from ${migrator.asyncMigrationIsEnabled}
	 * 					to ${!migrator.asyncMigrationIsEnabled} `,
	 * 	);
	 * 	migrator.asyncMigrationIsEnabled = !migrator.asyncMigrationIsEnabled;
	 * });
	 */
	asyncMigrationIsEnabled: boolVar('PINEJS_ASYNC_MIGRATION_ENABLED', true),
};

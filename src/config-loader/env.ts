// TODO-MAJOR: Drop the support for the global `DEBUG` env var
const { DEBUG: globalDebug, PINEJS_DEBUG } = process.env;
if (![undefined, '', '0', '1'].includes(PINEJS_DEBUG)) {
	// TODO-MAJOR: Throw on invalid value
	console.warn(`Invalid value for PINEJS_DEBUG '${PINEJS_DEBUG}'`);
}
// Setting PINEJS_DEBUG to explicitly '0' will disable debug even if global debug is truthy
export const DEBUG =
	PINEJS_DEBUG === '1' || (PINEJS_DEBUG !== '0' && !!globalDebug);

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

import * as memoize from 'memoizee';
import memoizeWeak = require('memoizee/weak');
export const createCache = <T extends (...args: any[]) => any>(
	cacheName: keyof typeof cache,
	fn: T,
	opts?: CacheFnOpts<T>,
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
};

export const migrator = {
	lockTimeout: 5 * 60 * 1000,
	// Used to delay the failure on lock taking, to avoid spam taking
	lockFailDelay: 20 * 1000,
};

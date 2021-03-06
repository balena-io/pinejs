import type { Resolvable } from './common-types';

import * as _ from 'lodash';

export type MappingFunction = <T, U>(
	a: T[],
	fn: (v: T) => Resolvable<U>,
) => Promise<Array<U | Error>>;

// The settle version of `Promise.mapSeries`
export const settleMapSeries: MappingFunction = async <T, U>(
	a: T[],
	fn: (v: T) => Resolvable<U>,
) => {
	const results: Array<U | Error> = [];
	for (const p of a) {
		try {
			const result = await fn(p);
			results.push(result);
		} catch (err) {
			results.push(ensureError(err));
		}
	}
	return results;
};

// This is used to guarantee that we convert a `.catch` result into an error, so that later code checking `_.isError` will work as expected
const ensureError = (err: any): Error => {
	if (err instanceof Error || _.isError(err)) {
		return err;
	}
	return new Error(err);
};

// Maps fn over collection and returns an array of Promises. If any promise in the
// collection is rejected it returns an array with the error, along with all the
// promises that were fulfilled up to that point
const mapTill: MappingFunction = async <T, U>(
	a: T[],
	fn: (v: T) => Resolvable<U>,
) => {
	const results: Array<U | Error> = [];
	for (const p of a) {
		try {
			const result = await fn(p);
			results.push(result);
		} catch (err) {
			results.push(ensureError(err));
			break;
		}
	}
	return results;
};

// Used to obtain the appropriate mapping function depending on the
// semantics specified by the Prefer: header.
export const getMappingFn = (headers?: {
	prefer?: string | string[];
	[key: string]: string | string[] | undefined;
}): MappingFunction => {
	if (headers != null && headers.prefer === 'odata.continue-on-error') {
		return settleMapSeries;
	} else {
		return mapTill;
	}
};

import * as _ from 'lodash';
import * as Promise from 'bluebird';
import { Resolvable } from './common-types';

export const liftP = <T, U>(fn: (v: T) => Resolvable<U>) => {
	return (a: T | T[]): Promise<U[] | U> => {
		if (_.isArray(a)) {
			// This must not be a settle as if any operation fails in a changeset
			// we want to discard the whole
			return Promise.mapSeries(a, fn);
		} else {
			return Promise.resolve(a).then(fn);
		}
	};
};

export interface MappingFunction {
	<T, U>(a: T[], fn: (v: T) => Resolvable<U>): Promise<Array<U | Error>>;
}

// The settle version of `Promise.mapSeries`
export const settleMapSeries: MappingFunction = (a, fn) => {
	const runF = Promise.method(fn);
	return Promise.mapSeries(a, _.flow(runF, wrap));
};

// This is used to guarantee that we convert a `.catch` result into an error, so that later code checking `_.isError` will work as expected
const ensureError = (err: any): Error => {
	if (err instanceof Error || _.isError(err)) {
		return err;
	}
	return new Error(err);
};

// Wrap a promise with reflection. This promise will always succeed, either
// with the value or the error of the promise it is wrapping
const wrap = <T>(p: Promise<T>) => {
	return p.then(_.identity as (value: T) => T, ensureError);
};

// Maps fn over collection and returns an array of Promises. If any promise in the
// collection is rejected it returns an array with the error, along with all the
// promises that were fulfilled up to that point
const mapTill: MappingFunction = <T, U>(
	a: T[],
	fn: (v: T) => Resolvable<U>,
) => {
	const runF = Promise.method(fn);
	const results: Array<U | Error> = [];
	return Promise.each(a, p => {
		return runF(p)
			.then(result => {
				results.push(result);
			})
			.tapCatch(err => {
				results.push(ensureError(err));
			});
	})
		.return(results)
		.catchReturn(results);
};

// Used to obtain the appropriate mapping function depending on the
// semantics specified by the Prefer: header.
export const getMappingFn = (headers?: {
	prefer?: string | string[];
	[key: string]: string | string[] | undefined;
}): MappingFunction => {
	if (headers != null && headers.prefer == 'odata.continue-on-error') {
		return settleMapSeries;
	} else {
		return mapTill;
	}
};

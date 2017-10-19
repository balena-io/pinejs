import * as _ from 'lodash'
import * as Promise from 'bluebird'

// TODO: We force the return type here to merge `Promise<U> | Promise<U[]>` into `Promise<U | U[]>,
// which is equivalent for our uses but fixes issues where typing were being rejected
export const liftP = <T, U>(fn: (v: T) => U | Promise<U>): (a: T | T[]) => Promise<U | U[]> => {
	return (a: T | T[]) => {
		if (_.isArray(a)) {
			// This must not be a settle as if any operation fails in a cs
			// we want to discard the whole
			return Promise.mapSeries(a, fn)
		} else {
			return Promise.resolve(a).then(fn)
		}
	}
}

interface MappingFunction {
	<T, U>(a: T[], fn: (v: T) => U | Promise<U>): Promise<Array<U | Error>>
}

// The settle- versions of
const settleMapSeries: MappingFunction = (a, fn) => {
	const runF = Promise.method(fn)
	return Promise.mapSeries(a, _.flow(runF, wrap))
}

// Wrap a promise with reflection. This promise will always succeed, either
// with the value or the error of the promise it is wrapping
const wrap = <T>(p: Promise<T>) => {
	return p.then(_.identity as (value: T) => T, _.identity as (value: Error) => Error)
}

// Maps fn over collection and returns an array of Promises. If any promise in the
// collection is rejected it returns an array with the error, along with all the
// promises that were fulfilled up to that point
const mapTill: MappingFunction = <T, U>(a: T[], fn: (v: T) => U) => {
	const runF = Promise.method(fn)
	const results: Array<U | any> = []
	return Promise.each(a, (p) => {
		return runF(p)
		.then((result) => {
			results.push(result)
		}).tapCatch((err) => {
			results.push(err)
		})
	})
	.return(results)
	.catchReturn(results)
}

// Used to obtain the appropriate mapping function depending on the
// semantics specified by the Prefer: header.
export const getMappingFn = (headers?: { prefer: string}): MappingFunction => {
	if (headers != null && headers.prefer == 'odata.continue-on-error') {
		return settleMapSeries
	} else {
		return mapTill
	}
}

import type { AnyObject } from './common-types.js';

export const WILDCARD = Symbol('*');
export const TERMINATE = Symbol('TERMINATE');
/**
 * Allow skipping properties whilst deep freezing in cases we know it's a property we've defined that will throw an error in some cases
 */
export const deepFreezeExceptPaths = (
	obj: AnyObject,
	excludePaths: Array<Array<string | typeof WILDCARD | typeof TERMINATE>> = [],
) => {
	if (!excludePaths.some((path) => path.length === 0)) {
		Object.freeze(obj);
	}

	propLoop: for (const prop of Object.getOwnPropertyNames(obj)) {
		const newExcludePaths: typeof excludePaths = [];
		for (const path of excludePaths) {
			if (path.length > 0 && (path[0] === prop || path[0] === WILDCARD)) {
				if (path[1] === TERMINATE) {
					// If we're terminating at this path/prop then we don't want to even try to access it as that could trigger getters or other side effects,
					// so we continue the outer loop
					continue propLoop;
				}
				newExcludePaths.push(path.slice(1));
			}
		}

		if (
			Object.hasOwn(obj, prop) &&
			obj[prop] !== null &&
			(typeof obj[prop] === 'object' || typeof obj[prop] === 'function')
		) {
			deepFreezeExceptPaths(obj[prop], newExcludePaths);
		}
	}
};

import * as _fs from 'fs';
import * as _ from 'lodash';

const cacheFile = process.env.PINEJS_CACHE_FILE || '.pinejs-cache.json';
let cache: null | {
	[name: string]: {
		[version: string]: {
			[srcJson: string]: any;
		};
	};
} = null;
let fs: undefined | typeof _fs;
try {
	// tslint:disable-next-line:no-var-requires
	fs = require('fs');
} catch (e) {}

const saveCache = _.debounce(() => {
	if (fs != null) {
		fs.writeFile(cacheFile, JSON.stringify(cache), 'utf8', err => {
			if (err) {
				console.warn('Error saving pinejs cache:', err);
			}
		});
		// Clear the cache once we trigger the save as it usually means we're
		// done with it and it allows us to free up the memory - if it does end
		// up being requested again it will just trigger a reload of the cache
		// but that should be a rare case
		cache = null;
	}
}, 5000);

export const cachedCompile = <T>(
	name: string,
	version: string,
	src: any,
	fn: () => T,
): T => {
	if (cache == null) {
		if (fs != null) {
			try {
				cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
			} catch (e) {}
		}
		if (cache == null) {
			cache = {};
		}
	}
	const key = [name, version, JSON.stringify(src)];
	let result = _.get(cache, key);
	if (result == null) {
		result = fn();
		_.set(cache, key, result);
		saveCache();
	}
	return _.cloneDeep(result);
};

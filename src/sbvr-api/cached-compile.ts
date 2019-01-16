import * as _fs from 'fs'
import * as _ from 'lodash'

const cacheFile = process.env.PINEJS_CACHE_FILE || '.pinejs-cache.json'
let cache: null | {
	[ name: string ]: {
		[ version: string ]: {
			[ srcJson: string ]: any
		}
	}
} = null
let fs: undefined | typeof _fs
try {
	// tslint:disable-next-line:no-var-requires
	fs = require('fs')
} catch (e) {}

const saveCache = _.debounce(
	() => {
		if (fs != null) {
			fs.writeFile(cacheFile, JSON.stringify(cache), 'utf8', (err) => {
				if (err) {
					console.warn('Error saving pinejs cache:', err)
				}
			})
		}
	},
	5000
)

export const cachedCompile = (name: string, version: string, src: any, fn: () => any) => {
	if (cache == null) {
		if (fs != null) {
			try {
				cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
			} catch (e) {}
		}
		if (cache == null) {
			cache = {}
		}
	}
	const key = [ name, version, JSON.stringify(src) ]
	let result = _.get(cache, key)
	if (result == null) {
		result = fn()
		_.set(cache, key, result)
		saveCache()
	}
	return _.cloneDeep(result)
}

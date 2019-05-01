import * as _fs from 'fs';

if (!process.browser) {
	if (typeof nodeRequire === 'undefined' || nodeRequire == null) {
		// `nodeRequire` is a special variable we use to bypass webpack's resolving of `require`
		// statements on build for the cases where we need to always use the nodejs require, eg
		// in the config-loader which dynamically loads code at runtime, and for adding custom
		// filetype handlers - it works by being replaced with `require` after the webpack build
		// finishes.
		// In the case of `nodeRequire` being undefined it means we're being run in a nodejs
		// environment directly, without a webpack build, and have to manually create it as an
		// alias for the nodejs require so that things continue to work.

		// Alias require as nodeRequire for the config-loader hack.
		global.nodeRequire = require;
	}
	// Register a .sbvr loader
	// tslint:disable-next-line:no-var-requires
	const fs: typeof _fs = require('fs');
	nodeRequire.extensions['.sbvr'] = (module: NodeModule, filename: string) =>
		(module.exports = fs.readFileSync(filename, 'utf8'));
}

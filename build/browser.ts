import * as webpack from 'webpack';
import sharedConfig = require('./config');
const config = { ...sharedConfig };

const root = config.entry;
config.entry = root + '/src/server-glue/server';

// Disable node express and load express-emulator instead
config.externals['express'] = false;
config.resolve.alias ??= {};
const resolveAlias = config.resolve.alias;
if (Array.isArray(resolveAlias)) {
	throw new Error('Expected resolve.alias to be an object');
}
resolveAlias.express = root + '/src/express-emulator/express';

config.plugins = config.plugins.concat(
	new webpack.DefinePlugin({
		'process.browser': true,
		'process.env.CONFIG_LOADER_DISABLED': true,
		'process.env.DEBUG': true,
		'process.env.SBVR_SERVER_ENABLED': true,
	}),
);

export = config;

import * as webpack from 'webpack';
import sharedConfig = require('./config');
const config = { ...sharedConfig };

config.entry += '/src/server-glue/server';
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin({
		'process.browser': false,

		'process.env.CONFIG_LOADER_DISABLED': false,
		'process.env.SBVR_SERVER_ENABLED': false,
	}),
);

export = config;

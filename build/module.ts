import * as webpack from 'webpack';
import sharedConfig = require('./config');
const config = { ...sharedConfig };

config.entry += '/src/server-glue/module';
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin({
		'process.browser': false,

		'process.env.CONFIG_LOADER_DISABLED': false,
		'process.env.SBVR_SERVER_ENABLED': false,
	}),
	// When we're compiling the module build we want to always ignore the server build file
	new webpack.IgnorePlugin({
		resourceRegExp: /server/,
		contextRegExp: /server-glue/,
	}),
);

export = config;

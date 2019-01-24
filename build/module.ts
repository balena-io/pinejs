import * as webpack from 'webpack';
import * as _ from 'lodash';
import sharedConfig = require('./config');
const config = _.clone(sharedConfig);

config.entry += '/src/server-glue/module';
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin({
		'process.browser': false,

		'process.env.CONFIG_LOADER_DISABLED': false,
		'process.env.SBVR_SERVER_ENABLED': false,
	}),
	// When we're compiling the module build we want to always ignore the server build file
	new webpack.IgnorePlugin(/server/, /server-glue/),
);

export = config;

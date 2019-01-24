import * as webpack from 'webpack';
import * as _ from 'lodash';
import sharedConfig = require('./config');
const config = _.clone(sharedConfig);

config.entry += '/src/server-glue/server';
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin({
		'process.browser': false,

		'process.env.CONFIG_LOADER_DISABLED': false,
		'process.env.SBVR_SERVER_ENABLED': false,
	}),
);

export = config;

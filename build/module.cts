import * as webpack from 'webpack';
import type { Configuration } from 'webpack';
import sharedConfig from './config.cts';

const config: Configuration = {
	...sharedConfig,
	entry: `${sharedConfig.entry}/src/server-glue/module`,
	plugins: [
		...sharedConfig.plugins,
		new webpack.DefinePlugin({
			'process.browser': false,

			'process.env.CONFIG_LOADER_DISABLED': false,
		}),
		// When we're compiling the module build we want to always ignore the server build file
		new webpack.IgnorePlugin({
			resourceRegExp: /server/,
			contextRegExp: /server-glue/,
		}),
	],
};

export default config;

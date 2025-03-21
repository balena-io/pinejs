import * as webpack from 'webpack';
import type { Configuration } from 'webpack';
import sharedConfig from './config.cts';

const config: Configuration = {
	...sharedConfig,
	entry: `${sharedConfig.entry}/src/server-glue/server`,
	plugins: [
		...sharedConfig.plugins,
		new webpack.DefinePlugin({
			'process.browser': false,

			'process.env.CONFIG_LOADER_DISABLED': false,
		}),
	],
};

export default config;

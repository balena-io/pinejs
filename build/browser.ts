import * as webpack from 'webpack';
import type { Configuration } from 'webpack';
import sharedConfig from './config';

if (typeof sharedConfig.externals !== 'object') {
	throw new Error('Expected externals to be an object');
}
if (Array.isArray(sharedConfig.resolve.alias)) {
	throw new Error('Expected resolve.alias to be an object');
}

const root = sharedConfig.entry;
const config: Configuration = {
	...sharedConfig,
	entry: `${root}/src/server-glue/server`,
	externals: {
		...sharedConfig.externals,
		// Disable node express and load express-emulator instead
		express: false,
	},
	resolve: {
		...sharedConfig.resolve,
		alias: {
			...sharedConfig.resolve.alias,
			express: `${root}/src/express-emulator/express`,
		},
	},
	plugins: [
		...sharedConfig.plugins,
		new webpack.DefinePlugin({
			'process.browser': true,
			'process.env.CONFIG_LOADER_DISABLED': true,
			'process.env.PINEJS_DEBUG': true,
			'process.env.SBVR_SERVER_ENABLED': true,
		}),
	],
};

export default config;

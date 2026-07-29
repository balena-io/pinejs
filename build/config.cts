import type { RequiredField } from '../src/sbvr-api/common-types.js' with {
	'resolution-mode': 'import',
};

import * as path from 'path';
import * as webpack from 'webpack';
import type { Configuration } from 'webpack';
const root = path.dirname(__dirname);

const config = {
	mode: 'production',
	devtool: 'source-map',
	entry: root,
	output: {
		libraryTarget: 'commonjs',
		path: root,
		filename: 'out/pine.js',
	},
	target: 'node',
	node: false,
	externals: {
		bcrypt: true,
		bcryptjs: true,
		'body-parser': true,
		child_process: true,
		compression: true,
		'cookie-parser': true,
		express: true,
		'express-session': true,
		fs: true,
		lodash: true,
		'method-override': true,
		mysql: true,
		passport: true,
		'passport-local': true,
		'pinejs-client-core': true,
		pg: true,
		'serve-static': true,
		'typed-error': true,
	},
	resolve: {
		alias: {},
		extensions: ['.js', '.ts'],
		extensionAlias: {
			'.js': ['.ts', '.js'],
			'.mjs': ['.mts', '.mjs'],
		},
	},
	plugins: [
		new webpack.optimize.LimitChunkCountPlugin({
			maxChunks: 1,
		}) as webpack.WebpackPluginInstance,
	],
	module: {
		rules: [
			{
				test: /\.sbvr$/,
				use: {
					loader: 'raw-loader',
					options: {
						esModule: false,
					},
				},
			},
			{
				test: /\.ts$|\.js$/,
				exclude: /node_modules/,
				use: 'ts-loader',
			},
		],
	},
} satisfies RequiredField<
	Configuration,
	'plugins' | 'resolve' | 'externals'
> & {
	externals: {
		[index: string]: string | boolean | string[] | { [index: string]: any };
	};
};

export default config;

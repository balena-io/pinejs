import type { RequiredField } from '../src/sbvr-api/common-types';

import * as path from 'path';
import * as webpack from 'webpack';
const root = path.dirname(__dirname);

export = {
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
		multer: true,
		mysql: true,
		passport: true,
		'passport-local': true,
		'pinejs-client-core': true,
		pg: true,
		'serve-static': true,
		'typed-error': true,
	},
	resolve: {
		extensions: ['.js', '.ts'],
	},
	plugins: [new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 })],
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
} as RequiredField<
	webpack.Configuration,
	'plugins' | 'resolve' | 'externals'
> & {
	externals: {
		[index: string]: string | boolean | string[] | { [index: string]: any };
	};
};

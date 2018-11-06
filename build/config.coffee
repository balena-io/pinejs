path = require 'path'
webpack = require 'webpack'
UMDRequirePlugin = require 'umd-require-webpack-plugin'
root = path.dirname(__dirname)

module.exports =
	devtool: 'source-map'
	entry: root
	output:
		libraryTarget: 'commonjs'
		path: root
		filename: 'out/pine.js'
	target: 'node'
	node:
		process: false
		global: false
		Buffer: false
		__dirname: false
		__filename: false
	externals:
		bcrypt: true
		bcryptjs: true
		bluebird: true
		'body-parser': true
		child_process: true
		'coffeescript': true
		'coffeescript/register': true
		'ts-node/register': true
		compression: true
		'cookie-parser': true
		express: true
		'express-session': true
		fs: true
		lodash: true
		'method-override': true
		multer: true
		mysql: true
		passport: true
		'passport-local': true
		'pinejs-client-core': true
		pg: true
		'serve-static': true
		'typed-error': true

	resolve:
		extensions: [
			''
			'.js'
			'.coffee'
			'.ts'
		]
	plugins: [
		new UMDRequirePlugin()
		new webpack.optimize.DedupePlugin()
		new webpack.optimize.LimitChunkCountPlugin(maxChunks: 1)
	]
	module:
		loaders: [
			{ test: /\.sbvr$/, loader: 'raw-loader' }
			{ test: /\.coffee$/, loader: 'coffee-loader' }
			{ test: /\.ts$/, loader: 'ts-loader' }
			{ test: /\.json$/, loader: 'json-loader' }
		]

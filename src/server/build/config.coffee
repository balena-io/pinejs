path = require 'path'
webpack = require 'webpack'
UMDRequirePlugin = require 'umd-require-webpack-plugin'
ExtractTextPlugin = require 'extract-text-webpack-plugin'
root = path.join(__dirname + '/../../..')

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
	externals: [
		bcrypt: true
		bcryptjs: true
		bluebird: true
		'body-parser': true
		child_process: true
		'coffee-script': true
		'coffee-script/register': true
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
		pg: true
		'serve-static': true
		'typed-error': true
	]
	resolve:
		alias:
			'ometa-core': 'ometa-js/lib/ometajs/core'

			'extended-sbvr-parser': root + '/src/common/extended-sbvr-parser/extended-sbvr-parser.coffee'

			'config-loader': root + '/src/server/src/config-loader'
			'data-server': root + '/src/server/src/data-server'
			'database-layer': root + '/src/server/src/database-layer'
			'express-emulator': root + '/src/server/src/express-emulator'
			'migrator': root + '/src/server/src/migrator'
			'pinejs-session-store': root + '/src/server/src/pinejs-session-store'
			'passport-pinejs': root + '/src/server/src/passport-pinejs'
			'server-glue': root + '/src/server/src/server-glue'
			'sbvr-api': root + '/src/server/src/sbvr-api'
			'sbvr-compiler': root + '/src/server/src/sbvr-compiler'
	plugins: [
		new UMDRequirePlugin()
		new webpack.optimize.DedupePlugin()
		new webpack.optimize.LimitChunkCountPlugin(maxChunks: 1)
	]
	module:
		loaders: [
			{ test: /\.(sbvr)$/, loader: 'raw-loader' }
			{ test: /\.ometa(js)?$/, loader: 'ometa-loader' }
			{ test: /\.coffee$/, loader: 'coffee-loader' }
		]

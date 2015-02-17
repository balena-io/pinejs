path = require 'path'
webpack = require 'webpack'
UMDRequirePlugin = require 'umd-require-webpack-plugin'
ExtractTextPlugin = require 'extract-text-webpack-plugin'
root = path.join(__dirname + '/../../..')

module.exports =
	devtool: 'source-map'
	entry: root + '/src/client/src/main.js'
	output:
		path: root + '/out'
		filename: 'main.js'
	resolve:
		root: [path.join(root, '/src/client/lib')]
		alias:
			'fs': 'null-loader'
			'bcrypt': 'bcryptjs'
			'module': 'null-loader'
			'coffee-script/register': 'null-loader'

			'express': root + '/src/server/src/express-emulator/express.coffee'
			'underscore': 'lodash'

			'bootstrap': 'bootstrap/docs/assets/js/bootstrap'
			'codemirror$': 'codemirror/lib/codemirror'
			'codemirror-ometa': 'ometa-js/lib/codemirror-ometa'
			'ejs': 'ejs/ejs'
			'jquery-ui': 'jquery-ui/ui/jquery-ui'
			'ometa-core': 'ometa-js/lib/ometajs/core'

			'templates': root + '/src/client/src/templates'
			'models': root + '/src/client/src/models'
			'views': root + '/src/client/src/views'
			'config': root + '/src/client/src/config.coffee'

			'ometa-highlighting': root + '/src/client/src/ometa-highlighting'
			'server-request': root + '/src/client/src/server-request.coffee'

			'extended-sbvr-parser': root + '/src/common/extended-sbvr-parser/extended-sbvr-parser.coffee'

			'config-loader': root + '/src/server/src/config-loader'
			'data-server': root + '/src/server/src/data-server'
			'database-layer': root + '/src/server/src/database-layer'
			'migrator': root + '/src/server/src/migrator'
			'pinejs-session-store': root + '/src/server/src/pinejs-session-store'
			'passport-pinejs': root + '/src/server/src/passport-pinejs'
			'server-glue': root + '/src/server/src/server-glue/server.coffee'
			'sbvr-api': root + '/src/server/src/sbvr-api'
			'sbvr-compiler': root + '/src/server/src/sbvr-compiler'
	plugins: [
		new UMDRequirePlugin()
		new webpack.ResolverPlugin(
			new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin('bower.json', ['main'])
		)
		new webpack.ProvidePlugin(
			jQuery: 'jquery'
			'window.jQuery': 'jquery'
		)
		new webpack.optimize.DedupePlugin()
		new ExtractTextPlugin('main.css', 
			allChunks: true
		)
		new webpack.optimize.LimitChunkCountPlugin(maxChunks: 1)
	]
	module:
		loaders: [
			{ test: /[\/\\]bootstrap.js/, loader: 'imports-loader?__css__=../css/bootstrap.css' }
			{ test: /[\/\\]show-hint.js/, loader: 'imports-loader?__css__=codemirror/addon/hint/show-hint.css' }
			{ test: /[\/\\]codemirror.js/, loader: 'imports-loader?__css__=codemirror/lib/codemirror.css' }
			{ test: /[\/\\]backbone.js/, loader: 'imports-loader?this=>' + encodeURIComponent('{$:require("jquery"), _:require("lodash")}') }

			{ test: /[\/\\]d3.js/, loader: 'exports-loader?d3' }
			{ test: /[\/\\]ejs.js/, loader: 'exports-loader?ejs' }
			{ test: /[\/\\]uglify-js.js/, loader: 'exports-loader?UglifyJS' }

			{ test: /\.(html|sbvr)$/, loader: 'raw-loader' }
			{ test: /\.ometa(js)?$/, loader: 'ometa-loader' }
			{ test: /\.css$/, loader: ExtractTextPlugin.extract('style-loader', 'css-loader') }
			{ test: /\.png$/, loader: 'url-loader?limit=100000&mimetype=image/png' }
			{ test: /\.jpg$/, loader: 'url-loader?limit=100000&mimetype=image/jpg' }
			{ test: /\.coffee$/, loader: 'coffee-loader' }
		]

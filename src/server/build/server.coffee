webpack = require 'webpack'
_ = require 'lodash'
config = _.clone require './config'

config.entry += '/src/server/src/server-glue/server.coffee'
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin(
		ENV_NODEJS: true
		ENV_BROWSER: false
		SBVR_EXTENSIONS: true
		SBVR_SERVER_ENABLED: false
		DEV: false

		CONFIG_LOADER: true
	)
)

module.exports = config

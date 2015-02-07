webpack = require 'webpack'
_ = require 'lodash'
config = _.clone require './config'

config.entry += '/src/server/src/server-glue/server.coffee'
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin(
		ENV_NODEJS: false
		ENV_BROWSER: true
		SBVR_EXTENSIONS: true
		SBVR_SERVER_ENABLED: true
		DEV: true

		CONFIG_LOADER: false
	)
)

module.exports = config

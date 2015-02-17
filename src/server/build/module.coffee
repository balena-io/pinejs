webpack = require 'webpack'
_ = require 'lodash'
config = _.clone require './config'

config.entry += '/src/server/src/server-glue/module.coffee'
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin(
		ENV_NODEJS: true
		SBVR_EXTENSIONS: true
		SBVR_SERVER_ENABLED: false
		DEV: false

		CONFIG_LOADER: true
	)
)

module.exports = config

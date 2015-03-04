webpack = require 'webpack'
_ = require 'lodash'
config = _.clone require './config'

config.entry += '/src/server/src/server-glue/server.coffee'
config.plugins = config.plugins.concat(
	new webpack.DefinePlugin(
		'process.browser': true
		'process.env.CONFIG_LOADER_DISABLED': true
		'process.env.DEBUG': true
		'process.env.SBVR_SERVER_ENABLED': true
	)
)

module.exports = config

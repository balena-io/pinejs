webpack = require 'webpack'
_ = require 'lodash'
config = _.clone require './config'

config.plugins = config.plugins.concat(
	new webpack.DefinePlugin(
		TAB_SBVR_EDITOR: true
		TAB_SBVR_LF: true
		TAB_SBVR_GRAPH: true
		TAB_SBVR_SERVER: true
		TAB_DDUI: true
		TAB_DB_IMPORT_EXPORT: true
		TAB_VALIDATE: true

		# For the in-browser server
		ENV_NODEJS: false
		ENV_BROWSER: true
		DEV: true

		'process.env.CONFIG_LOADER_DISABLED': true
		'process.env.SBVR_SERVER_ENABLED': true
	)
)

module.exports = config

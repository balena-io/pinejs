webpack = require 'webpack'
_ = require 'lodash'
config = _.clone require './config'

config.plugins = config.plugins.concat(
	new webpack.DefinePlugin(
		TAB_SBVR_EDITOR: false
		TAB_SBVR_LF: false
		TAB_SBVR_GRAPH: false
		TAB_SBVR_SERVER: false
		TAB_DDUI: true
		TAB_DB_IMPORT_EXPORT: false
		TAB_VALIDATE: false

		# For the in-browser server
		ENV_NODEJS: false
		ENV_BROWSER: false
		DEV: true

		'process.env.CONFIG_LOADER_DISABLED': true
		'process.env.SBVR_SERVER_ENABLED': false
	)
)

module.exports = config

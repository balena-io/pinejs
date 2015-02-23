webpack = require 'webpack'
_ = require 'lodash'
config = _.clone require './config'

config.plugins = config.plugins.concat(
	new webpack.DefinePlugin(
		TAB_SBVR_EDITOR: true
		TAB_SBVR_LF: true
		TAB_SBVR_GRAPH: true
		TAB_SBVR_SERVER: false
		TAB_DDUI: false
		TAB_DB_IMPORT_EXPORT: false
		TAB_VALIDATE: false

		# For the in-browser server
		ENV_NODEJS: false
		ENV_BROWSER: false
		SBVR_SERVER_ENABLED: false
		DEV: false

		CONFIG_LOADER: false
	)
)

module.exports = config

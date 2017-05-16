if !process.browser
	if !nodeRequire?
		# `nodeRequire` is a special variable we use to bypass webpack's resolving of `require`
		# statements on build for the cases where we need to always use the nodejs require, eg
		# in the config-loader which dynamically loads code at runtime, and for adding custom
		# filetype handlers - it works by being replaced with `require` after the webpack build
		# finishes.
		# In the case of `nodeRequire` being undefined it means we're being run in a nodejs
		# environment directly, without a webpack build, and have to manually create it as an
		# alias for the nodejs require so that things continue to work.

		# Alias require as nodeRequire for the config-loader hack.
		global.nodeRequire = require

	# Register a .sbvr loader
	fs = require 'fs'
	nodeRequire.extensions['.sbvr'] = (module, filename) ->
		module.exports = fs.readFileSync(filename, encoding: 'utf8')
	# Register the .ometajs loader
	nodeRequire('ometa-js')

Promise = require 'bluebird'
dbModule = require '../database-layer/db'
sbvrUtils = require '../sbvr-api/sbvr-utils'
configLoader = require '../config-loader/config-loader'
migrator = require '../migrator/migrator'
PinejsSessionStore = require '../pinejs-session-store/pinejs-session-store'

if dbModule.websql?
	databaseOptions =
		engine: 'websql'
		params: 'rulemotion'
else
	databaseURL =
		if process.env.DATABASE_URL
			process.env.DATABASE_URL
		else if dbModule.postgres?
			'postgres://postgres:.@localhost:5432/postgres'
		else if dbModule.mysql?
			'mysql://mysql:.@localhost:3306'
		else
			throw new Error('No supported database options available')
	databaseOptions =
		engine: databaseURL[...databaseURL.indexOf(':')]
		params: databaseURL

db = dbModule.connect(databaseOptions)

init = (app, config) ->
	sbvrUtils.setup(app, db)
	.then ->
		configLoader = configLoader.setup(app)
		configLoader.loadConfig(migrator.config)
		.return(configLoader)
	.tap (configLoader) ->
		promises = []

		if process.env.SBVR_SERVER_ENABLED
			sbvrServer = require '../data-server/SBVRServer'
			promises.push configLoader.loadConfig(sbvrServer.config)

		if process.env.SBVR_SERVER_ENABLED
			transactions = require '../http-transactions/transactions'
			promises.push configLoader.loadConfig(transactions.config).then(-> transactions.addModelHooks('data'))

		if !process.env.CONFIG_LOADER_DISABLED
			promises.push configLoader.loadApplicationConfig(config)

		Promise.all(promises)
	.catch (err) ->
		console.error('Error initialising server', err, err.stack)
		process.exit(1)

module.exports = { init, sbvrUtils, SessionStore: PinejsSessionStore }

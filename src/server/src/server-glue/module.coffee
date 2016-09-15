if !process.browser and !nodeRequire?
	# If nodeRequire doesn't exist then we're being run directly,
	# and have to set up some stuff that webpack would otherwise deal with.

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
sbvrServer = require '../data-server/SBVRServer'
transactions = require '../http-transactions/transactions'
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
		Promise.all([
			configLoader.loadConfig(sbvrServer.config) if process.env.SBVR_SERVER_ENABLED
			configLoader.loadConfig(transactions.config).then(-> transactions.addModelHooks('data')) if process.env.SBVR_SERVER_ENABLED
			configLoader.loadApplicationConfig(config) if !process.env.CONFIG_LOADER_DISABLED
		])
	.catch (err) ->
		console.error('Error initialising server', err, err.stack)
		process.exit()

module.exports = { init, sbvrUtils, SessionStore: PinejsSessionStore }

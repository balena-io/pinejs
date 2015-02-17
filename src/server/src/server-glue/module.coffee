Promise = require 'bluebird'
dbModule = require '../database-layer/db.coffee'
sbvrUtils = require '../sbvr-api/sbvr-utils.coffee'
sbvrServer = require '../data-server/SBVRServer.coffee'
configLoader = require '../config-loader/config-loader.coffee'
migrator = require '../migrator/migrator.coffee'
PinejsSessionStore = require '../pinejs-session-store/pinejs-session-store.coffee'

if dbModule.websql?
	databaseOptions =
		engine: 'websql'
		params: 'rulemotion'
else 
	databaseURL = process.env.DATABASE_URL || 'postgres://postgres:.@localhost:5432/postgres'
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
	.then (configLoader) ->
		Promise.all([
			configLoader.loadConfig(sbvrServer.config) if SBVR_SERVER_ENABLED
			configLoader.loadApplicationConfig(config) if CONFIG_LOADER
		]).return(configLoader)
	.catch (err) ->
		console.error('Error initialising server', err)
		process.exit()

module.exports = {init, sbvrUtils, SessionStore: PinejsSessionStore}

define [
	'bluebird'
	'database-layer/db.coffee'
	'sbvr-api/sbvr-utils.coffee'
	'data-server/SBVRServer.coffee'
	'config-loader/config-loader.coffee'
	'migrator/migrator.coffee'
	'pinejs-session-store/pinejs-session-store.coffee'
], (Promise, dbModule, sbvrUtils, sbvrServer, configLoader, migrator, PinejsSessionStore) ->

	if ENV_NODEJS
		databaseURL = process.env.DATABASE_URL || 'postgres://postgres:.@localhost:5432/postgres'
		databaseOptions =
			engine: databaseURL[...databaseURL.indexOf(':')]
			params: databaseURL
	else
		databaseOptions =
			engine: 'websql'
			params: 'rulemotion'

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

	return {init, sbvrUtils, SessionStore: PinejsSessionStore}

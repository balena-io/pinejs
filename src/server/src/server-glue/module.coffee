define [
	'require'
	'has'
	'bluebird'
	'cs!database-layer/db'
	'cs!sbvr-api/sbvr-utils'
	'cs!data-server/SBVRServer'
	'cs!config-loader/config-loader'
	'cs!platform-session-store/platform-session-store'
], (requirejs, has, Promise, dbModule, sbvrUtils, sbvrServer, configLoader, PlatformSessionStore) ->

	if has 'ENV_NODEJS'
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
		sbvrUtils.setup(app, requirejs, db)
		.then ->
			configLoader = configLoader.setup(app, requirejs)

			Promise.all([
				configLoader.loadConfig(sbvrServer.config) if has 'SBVR_SERVER_ENABLED'
				configLoader.loadApplicationConfig(config) if has 'CONFIG_LOADER'
			]).return(configLoader)
		.catch (err) ->
			console.error('Error initialising server', err)
			process.exit()

	return {init, sbvrUtils, SessionStore: PlatformSessionStore}

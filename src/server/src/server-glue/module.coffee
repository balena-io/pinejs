define [
	'require'
	'has'
	'bluebird'
	'cs!database-layer/db'
	'cs!sbvr-api/sbvr-utils'
	'cs!platform-session-store/platform-session-store'
	'cs!data-server/SBVRServer'
	'cs!config-loader/config-loader'
], (requirejs, has, Promise, dbModule, sbvrUtils, PlatformSessionStore, sbvrServer, configLoader) ->
	databaseURL = process.env.DATABASE_URL || 'postgres://postgres:.@localhost:5432/postgres'
	databaseOptions =
		engine: databaseURL[0...databaseURL.indexOf(':')]
		params: databaseURL

	db = dbModule.connect(databaseOptions)

	init = (app, config) ->
		sbvrUtils.setup(app, requirejs, db)
		.then ->
			configLoader = configLoader.setup(app, requirejs)
			promises = []

			if has 'SBVR_SERVER_ENABLED'
				promises.push(configLoader.loadConfig(sbvrServer.config))

			promises.push(configLoader.loadConfig(PlatformSessionStore.config))

			if has 'CONFIG_LOADER'
				promises.push(configLoader.loadNodeConfig(config))

			Promise.all(promises).return(configLoader)
		.catch (err) ->
			console.error('Error initialising server', err)
			process.exit()

	return {init, sbvrUtils}

define [
	'require'
	'has'
	'bluebird'
	'cs!database-layer/db'
	'cs!sbvr-api/sbvr-utils'
	'cs!data-server/SBVRServer'
	'cs!config-loader/config-loader'
], (requirejs, has, Promise, dbModule, sbvrUtils, sbvrServer, configLoader) ->
	databaseURL = process.env.DATABASE_URL || 'postgres://postgres:.@localhost:5432/postgres'
	databaseOptions =
		engine: databaseURL[0...databaseURL.indexOf(':')]
		params: databaseURL

	db = dbModule.connect(databaseOptions)

	init = (app, config) ->
		sbvrUtils.setup(app, requirejs, db)
		.then ->
			configLoader = configLoader.setup(app, requirejs)

			Promise.all([
				configLoader.loadConfig(sbvrServer.config) if has 'SBVR_SERVER_ENABLED'
				configLoader.loadNodeConfig(config) if has 'CONFIG_LOADER'
			]).return(configLoader)
		.catch (err) ->
			console.error('Error initialising server', err)
			process.exit()

	return {init, sbvrUtils}

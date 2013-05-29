define([
	'has'
	'cs!database-layer/db'
	'cs!server-glue/sbvr-utils'
	'cs!passport-bcrypt/passportBCrypt'
	'cs!data-server/SBVRServer'
	'cs!express-emulator/express'
	'cs!config-loader/config-loader'
], (has, dbModule, sbvrUtils, passportBCrypt, sbvrServer, express, configLoader) ->
	if has 'ENV_NODEJS'
		databaseURL = process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres"
		databaseOptions =
			engine: databaseURL[0...databaseURL.indexOf(':')]
			params: databaseURL
	else
		databaseOptions =
			engine: 'websql'
			params: 'rulemotion'

	db = dbModule.connect(databaseOptions)


	setupCallback = (app) ->
		sbvrUtils.setup(app, require, db, (err) ->
			passportBCrypt = passportBCrypt({
					loginUrl: '/login',
					failureRedirect: '/login.html',
					successRedirect: '/'
				}, sbvrUtils, app, passport)

			if has 'CONFIG_LOADER'
				configLoader.setup(app, require, sbvrUtils, db)

			if has 'SBVR_SERVER_ENABLED'
				sbvrServer.setup(app, require, sbvrUtils, db)

			if has 'ENV_NODEJS'
				app.listen(process.env.PORT or 1337, () ->
					console.info('Server started')
				)

			if has 'ENV_BROWSER'
				app.enable()
		)



	if has 'ENV_NODEJS'
		express = require('express')
		passport = require('passport')
		app = express()
		app.configure('production', ->
			console.log = ->
		)
		app.configure(->
			path = require('path')
			app.use(express.compress())
			app.use(express.cookieParser())
			app.use(express.bodyParser())
			app.use(express.session({ secret: "A pink cat jumped over a rainbow" }))
			app.use(passport.initialize())
			app.use(passport.session())

			app.use((req, res, next) ->
				origin = req.get("Origin") || "*"
				res.header('Access-Control-Allow-Origin', origin)
				res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS, HEAD')
				res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Application-Record-Count, MaxDataServiceVersion')
				res.header('Access-Control-Allow-Credentials', 'true')
				next()
			)

			app.use(app.router)

			if has 'DEV'
				rootPath = path.join(__dirname, '/../../../..')
				app.use('/client', express.static(path.join(rootPath, 'client')))
				app.use('/common', express.static(path.join(rootPath, 'common')))
				app.use('/external', express.static(path.join(rootPath, 'external')))
				app.use('/tools', express.static(path.join(rootPath, 'tools')))
			app.use('/', express.static(path.join(__dirname, 'static')))
		)
	else if has 'ENV_BROWSER'
		app = express.app

	setupCallback(app)
	
	return {app, sbvrUtils}
)

define([
	'has'
	'cs!server-glue/sbvr-utils'
	'cs!passport-bcrypt/passportBCrypt'
	'cs!data-server/SBVRServer'
	'cs!editor-server/editorServer'
	'cs!express-emulator/express'
], (has, sbvrUtils, passportBCrypt, sbvrServer, editorServer, express)->
	if has 'ENV_NODEJS'
		if has 'USE_MYSQL'
			databaseOptions =
				engine: 'mysql'
				params: process.env.DATABASE_URL || {
					host: 'localhost'
					user: 'root'
					password: '.'
					database: 'rulemotion'
				}
		else if has 'USE_POSTGRES'
			databaseOptions =
				engine: 'postgres'
				params: process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres"
		else
			throw 'What database do you want??'
	else
		databaseOptions =
			engine: 'websql'
			params: 'rulemotion'

			

	setupCallback = (app) ->
		sbvrUtils.setup(app, require, databaseOptions)
		passportBCrypt = passportBCrypt({
				loginUrl: '/login',
				failureRedirect: '/login.html',
				successRedirect: '/'
			}, sbvrUtils, app, passport)
		
		if has 'SBVR_SERVER_ENABLED'
			sbvrServer.setup(app, require, sbvrUtils, passportBCrypt.isAuthed, databaseOptions)

		if has 'EDITOR_SERVER_ENABLED'
			editorServer.setup(app, require, sbvrUtils, passportBCrypt.isAuthed, databaseOptions)

		if has 'ENV_NODEJS'
			app.listen(process.env.PORT or 1337, () ->
				console.log('Server started')
			)



	if has 'ENV_NODEJS'
		express = require('express')
		passport = require('passport')
		app = express()
		app.configure(->
			path = require('path')
			rootPath = path.join(__dirname + '/../../../..')
			app.use(express.cookieParser())
			app.use(express.bodyParser())
			app.use(express.session({ secret: "A pink cat jumped over a rainbow" }))
			app.use(passport.initialize())
			app.use(passport.session())
			
			if has 'DEV'
				app.use('/client', express.static(path.join(rootPath, 'client')))
				app.use('/common', express.static(path.join(rootPath, 'common')))
				app.use('/external', express.static(path.join(rootPath, 'external')))
				app.use('/tools', express.static(path.join(rootPath, 'tools')))
			app.use((req, res, next) ->
				origin = req.get("Origin") || "*"
				res.header('Access-Control-Allow-Origin', origin)
				res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS, HEAD')
				res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Application-Record-Count')
				res.header('Access-Control-Allow-Credentials', 'true')
				next()
			)
		)
		
		setupCallback(app)
	else
		if has 'BROWSER_SERVER_ENABLED'
			window?.remoteServerRequest = express.app.process
			setupCallback(express.app)
)

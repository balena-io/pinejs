define(['express', 'passport', 'path', 'has'], (express, passport, path, has)->
	if has 'ENV_NODEJS'
		if has 'USE_MYSQL'
			databaseOptions =
				engine: 'mysql'
				params: process.env.DATABASE_URL || {
					host: 'localhost'
					user: 'root'
					password: '1234'
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
		require(['cs!server-glue/sbvr-utils', 'cs!passport-bcrypt/passportBCrypt'], (sbvrUtils, passportBCrypt) ->
			sbvrUtils.setup(app, require, databaseOptions)
			passportBCrypt = passportBCrypt({
					loginUrl: '/login',
					failureRedirect: '/login.html',
					successRedirect: '/'
				}, sbvrUtils, app, passport)
			
			if has 'SBVR_SERVER_ENABLED'
				require(['cs!data-server/SBVRServer'], (sbvrServer) ->
					sbvrServer.setup(app, require, sbvrUtils, passportBCrypt.isAuthed, databaseOptions)
				)

			if has 'EDITOR_SERVER_ENABLED'
				require(['cs!editor-server/editorServer'], (editorServer) ->
					editorServer.setup(app, require, sbvrUtils, passportBCrypt.isAuthed, databaseOptions)
				)
		)

		if has 'ENV_NODEJS'
			app.listen(process.env.PORT or 1337, () ->
				console.log('Server started')
			)



	if has 'ENV_NODEJS'
		app = express()
		app.configure(->
			app.use(express.cookieParser())
			app.use(express.bodyParser())
			app.use(express.session({ secret: "A pink cat jumped over a rainbow" }))
			app.use(passport.initialize())
			app.use(passport.session())
			#app.use('/client', express.static(path.join(rootPath, 'client')))
			#app.use('/common', express.static(path.join(rootPath, 'common')))
			#app.use('/external', express.static(path.join(rootPath, 'external')))
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
			require(['cs!express-emulator/express'], (express) ->
				window?.remoteServerRequest = express.app.process
				setupCallback(express.app)
			)
)

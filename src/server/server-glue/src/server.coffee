setupCallback = (requirejs, app) ->
	#IFDEF server
	requirejs(['data-server/SBVRServer'], (sbvrServer) ->
		sbvrServer.setup(app, requirejs)
	)
	#ENDIFDEF

	#IFDEF editor
	requirejs(['editorServer'], (editorServer) ->
		editorServer.setup(app, requirejs)
	)
	#ENDIFDEF

	if process?
		app.listen(process.env.PORT or 1337, () ->
			console.log('Server started')
		)



if process?
	requirejs = require('requirejs')
	requirejs.config(
		nodeRequire: require
		baseUrl: 'js'
	)
	
	express = require('express')
	app = express.createServer()
	#IFDEF server
	passport = require('passport')
	#ENDIFDEF
	
	app.configure(->
		#IFDEF server
		app.use(express.cookieParser())
		#ENDIFDEF
		app.use(express.bodyParser())
		#IFDEF server
		app.use(express.session({ secret: "A pink cat jumped over a rainbow" }))
		app.use(passport.initialize())
		app.use(passport.session())
		#ENDIFDEF
		app.use(express.static(process.cwd()))
	)
	
	#IFDEF server
	db = null
	requirejs(['mylibs/db'], (dbModule) ->
		db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres")
		requirejs('mylibs/passportBCrypt').init(passport, db)
	)
	
	app.post('/login', passport.authenticate('local', {failureRedirect: '/login.html'}), (req, res, next) ->
		res.redirect('/')
	)
	#ENDIFDEF
	setupCallback(requirejs, app)
else
	requirejs = window.requirejs
	#IFDEF websql
	requirejs(['express-emulator'], (express) ->
		window?.remoteServerRequest = express.app.process
		setupCallback(requirejs, express.app)
	)
	#ENDIFDEF

# fs = require('fs')
# lazy = require("lazy")
# imported = 0
# new lazy(fs.createReadStream(process.argv[2])).lines.forEach((query) ->
	# query = query.toString().trim()
	# if query.length > 0
		# _db.run query, (error) ->
			# if error
				# console.log error, imported++
			# else
				# console.log "Import Success", imported++
# )

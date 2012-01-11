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
	)
	crypto = require('crypto')
	
	passport.serializeUser( (user, done)  ->
		done(null, user)
	)

	passport.deserializeUser( (user, done) ->
		done(null, user)
	)
	
	LocalStrategy = require('passport-local').Strategy;
	passport.use(new LocalStrategy(
		(username, password, done) ->
			db.transaction( (tx) ->
				password = crypto.createHash('sha512').update(password).digest('hex')
				tx.executeSql('SELECT 1 FROM users WHERE username = ? AND password = ?', [username,password],
					(tx, result) ->
						if result.rows.length == 0
							done(null, false)
						else
							done(null, username)
					(tx, err) ->
						done(null, false)
				)
			)
	))
	app.post('/login', passport.authenticate('local', {failureRedirect: '/login.html'}), (req, res, next) ->
		res.redirect('/')
	)
	#ENDIFDEF
else
	requirejs = window.requirejs
	app = do() ->
		handlers =
			POST: []
			PUT: []
			DELETE: []
			GET: []
		addHandler = (handlerName, match, middleware...) ->
			#Strip wildcard
			match = match.replace(/[\/\*]*$/,'')
			paramMatch = /:(.*)$/.exec(match)
			paramName = (paramMatch == null ? null : paramMatch[1] )
			handlers[handlerName].push(
				match: match
				paramName: paramName
				middleware: middleware
			)
		return {
			post: (args...) -> addHandler.apply(null, ['POST'].concat(args))
			get: (args...) -> addHandler.apply(null, ['GET'].concat(args))
			put: (args...) -> addHandler.apply(null, ['PUT'].concat(args))
			del: (args...) -> addHandler.apply(null, ['DELETE'].concat(args))
			all: () ->
				this.post.apply(this, arguments)
				this.get.apply(this, arguments)
				this.put.apply(this, arguments)
				this.del.apply(this, arguments)
			process: (method, uri, headers, body, successCallback, failureCallback) ->
				if uri[-1..] == '/'
					uri = uri[0...uri.length - 1]
				uri = uri.toLowerCase()
				console.log(uri)
				if !handlers[method]
					failureCallback(404)
				req =
					body: body
					headers: headers
					url: uri
					params: {}
				res =
					json: (obj, headers = 200, statusCode) ->
						if typeof headers == 'number' and !statusCode?
							[statusCode, headers] = [headers, {}]
						if statusCode == 404
							failureCallback(statusCode, obj)
						else
							successCallback(statusCode, obj)
					send: (statusCode) ->
						if statusCode == 404
							failureCallback(statusCode)
						else
							successCallback(statusCode)
				next = (route) ->
					j++
					if route == 'route' or j >= methodHandlers[i].middleware.length
						checkMethodHandlers()
					else
						methodHandlers[i].middleware[j](req, res, next)
				
				methodHandlers = handlers[method]
				i = -1
				j = -1
				checkMethodHandlers = () ->
					i++
					if i < methodHandlers.length
						if uri[0...methodHandlers[i].match.length] == methodHandlers[i].match
							j = -1
							if methodHandlers[i].paramName != null
								req.params[methodHandlers[i].paramName] = uri[methodHandlers[i].match.length..]
							next()
						else
							checkMethodHandlers()
					else
						res.send(404)
				checkMethodHandlers()
		}
	#IFDEF websql
	window?.remoteServerRequest = app.process
	#ENDIFDEF

isAuthed = (req, res, next) ->
	if (!req.isAuthenticated? || req.isAuthenticated())
		next()
	else
		res.redirect('/login.html')

#IFDEF server
requirejs(['mylibs/SBVRServer'], (sbvrServer) ->
	sbvrServer.setup(app, requirejs, isAuthed)
)
#ENDIFDEF

#IFDEF editor
requirejs(['mylibs/editorServer'], (editorServer) ->
	editorServer.setup(app, requirejs, isAuthed)
)
#ENDIFDEF

if process?
	app.listen(process.env.PORT or 1337, () ->
		console.log('Server started')
	)

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

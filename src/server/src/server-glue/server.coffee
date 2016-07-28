Pinejs = require './module.coffee'

Promise = require 'bluebird'
sbvrUtils = require '../sbvr-api/sbvr-utils.coffee'
passportPinejs = require '../passport-pinejs/passport-pinejs.coffee'
PinejsSessionStore = require '../pinejs-session-store/pinejs-session-store.coffee'

express = require 'express'

app = express()
switch app.get('env')
	when 'production'
		console.log = ->
	when 'development'
		Promise.longStackTraces()

if !process.browser
	passport = require 'passport'
	path = require 'path'
	compression = require 'compression'
	serveStatic = require 'serve-static'
	cookieParser = require 'cookie-parser'
	bodyParser = require 'body-parser'
	multer = require 'multer'
	methodOverride = require 'method-override'
	expressSession = require 'express-session'

	app.use(compression())

	root = process.argv[2] or __dirname
	app.use('/', serveStatic(path.join(root, 'static')))

	app.use(cookieParser())
	app.use(bodyParser())
	app.use(multer().any())
	app.use(methodOverride())
	app.use(expressSession(
		secret: 'A pink cat jumped over a rainbow'
		store: new PinejsSessionStore()
	))
	app.use(passport.initialize())
	app.use(passport.session())

	app.use (req, res, next) ->
		origin = req.get('Origin') || '*'
		res.header('Access-Control-Allow-Origin', origin)
		res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS, HEAD')
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Application-Record-Count, MaxDataServiceVersion, X-Requested-With')
		res.header('Access-Control-Allow-Credentials', 'true')
		next()

	app.use (req, res, next) ->
		console.log('%s %s', req.method, req.url)
		next()

initialised = Pinejs.init(app)
.then (configLoader) ->
	Promise.all [
		configLoader.loadConfig(passportPinejs.config)
		configLoader.loadConfig(PinejsSessionStore.config)
	]
.then ->
	if !process?.env.DISABLE_DEFAULT_AUTH
		app.post '/login', passportPinejs.login (err, user, req, res, next) ->
			if err
				console.error('Error logging in', err, err.stack)
				res.sendStatus(500)
			else if user is false
				if req.xhr is true
					res.sendStatus(401)
				else
					res.redirect('/login.html')
			else
				if req.xhr is true
					res.sendStatus(200)
				else
					res.redirect('/')

		app.get '/logout', passportPinejs.logout, (req, res, next) ->
			res.redirect('/')
.then ->
	app.listen process.env.PORT or 1337, ->
		console.info('Server started')
.catch (err) ->
	console.error('Error initialising server', err, err.stack)
	process.exit()

module.exports = { initialised, app, sbvrUtils }

Promise = require 'bluebird'
sbvrUtils = require '../sbvr-api/sbvr-utils.coffee'
passportPinejs = require '../passport-pinejs/passport-pinejs.coffee'
PinejsSessionStore = require '../pinejs-session-store/pinejs-session-store.coffee'
Pinejs = require './module.coffee'

if ENV_NODEJS
	express = require('express')
	passport = require('passport')
	app = express()
	app.configure 'production', ->
		console.log = ->
	app.configure 'development', ->
		Promise.longStackTraces()
	app.configure ->
		path = require('path')
		app.use(express.compress())

		if DEV
			rootPath = path.join(__dirname, '/../../../..')
			app.use('/client', express.static(path.join(rootPath, 'client')))
			app.use('/common', express.static(path.join(rootPath, 'common')))
			app.use('/tools', express.static(path.join(rootPath, 'tools')))
		app.use('/', express.static(path.join(__dirname, 'static')))

		app.use(express.cookieParser())
		app.use(express.bodyParser())
		app.use(express.methodOverride())
		app.use(express.session(
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

		app.use(app.router)
else if ENV_BROWSER
	express = require '../express-emulator/express.coffee'
	Promise.longStackTraces()
	app = express.app

Pinejs.init(app)
.then (configLoader) ->
	Promise.all [
		configLoader.loadConfig(passportPinejs.config)
		configLoader.loadConfig(PinejsSessionStore.config) if ENV_NODEJS
	]
.then ->
	if !process?.env.DISABLE_DEFAULT_AUTH
		app.post '/login', passportPinejs.login (err, user, req, res, next) ->
			if err
				console.error('Error logging in', err, err.stack)
				res.send(500)
			else if user is false
				if req.xhr is true
					res.send(401)
				else
					res.redirect('/login.html')
			else
				if req.xhr is true
					res.send(200)
				else
					res.redirect('/')

		app.get '/logout', passportPinejs.logout, (req, res, next) ->
			res.redirect('/')
.then ->
	if ENV_NODEJS
		app.listen process.env.PORT or 1337, ->
			console.info('Server started')

	if ENV_BROWSER
		app.enable()
.catch (err) ->
	console.error('Error initialising server', err)
	process.exit()

module.exports = {app, sbvrUtils}

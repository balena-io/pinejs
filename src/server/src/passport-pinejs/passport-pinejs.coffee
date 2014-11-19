define [
	'exports'
	'has'
	'bluebird'
], (exports, has, Promise) ->
	exports.config =
		models: [
			customServerCode: 'cs!passport-pinejs/passport-pinejs'
		]
	exports.setup = (app, requirejs, sbvrUtils) ->
		exports.checkPassword = checkPassword = (username, password, done) ->
			sbvrUtils.checkPassword(username, password)
			.catch ->
				return false
			.then (user) ->
				done(null, user)

		if has 'ENV_NODEJS'
			passport = require('passport')
			app.use(passport.initialize())
			app.use(passport.session())

			LocalStrategy = require('passport-local').Strategy

			passport.serializeUser (user, done)  ->
				done(null, user)

			passport.deserializeUser (user, done) ->
				done(null, user)

			passport.use(new LocalStrategy(checkPassword))

			login = (fn) ->
				(req, res, next) ->
					passport.authenticate('local', (err, user) ->
						if err or !user
							fn(err, user, req, res, next)
							return
						req.login user, (err) ->
							fn(err, user, req, res, next)
					)(req, res, next)

			logout = (req, res, next) ->
				req.logout()
				next()
		else
			do ->
				_user = false
				app.use (req, res, next) ->
					if _user isnt false
						req.user = _user
					next()

				login = (fn) ->
					(req, res, next) ->
						checkPassword req.body.username, req.body.password, (err, user) ->
							if user
								_user = user
							fn(err, user, req, res, next)

				logout = (req, res, next) ->
					req.user = null
					_user = false
					next()
		# Takes a fn with signature (req, res, next, err, user) - a standard express signature with the addition of the err/user entries.
		# And returns a middleware that will handle logging in using `username` and `password` body properties
		exports.login = login
		# Returns a middleware that logs the user out and then calls next()
		exports.logout = logout
		return Promise.resolve()

	return exports

define [
	'exports'
	'has'
	'bluebird'
], (exports, has, Promise) ->
	exports.config =
		models: [
			customServerCode: 'cs!passport-platform/passport-platform'
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

			exports.login = (fn) ->
				(req, res, next) ->
					passport.authenticate('local', (err, user) ->
						if err or !user
							fn(err, user, req, res, next)
							return
						req.login user, (err) ->
							fn(err, user, req, res, next)
					)(req, res, next)

			exports.logout = (req, res, next) ->
				req.logout()
				next()
		else
			do ->
				_user = false
				app.use (req, res, next) ->
					if _user isnt false
						req.user = _user

				exports.login = (fn) ->
					(req, res, next) ->
						checkPassword req.body.username, req.body.password, (err, user) ->
							if user
								_user = user
							fn(err, user, req, res, next)

				exports.logout = (req, res, next) ->
					req.user = null
					_user = false
					next()
		return Promise.resolve()

	return exports

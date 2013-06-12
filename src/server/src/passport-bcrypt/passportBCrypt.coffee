define(['async'], () ->
	return (options, sbvrUtils, app, passport) ->
		exports = {}
		checkPassword = (username, password, done) ->
			sbvrUtils.runURI('GET', "/Auth/user?$filter=user/username eq '" + username + "'", {}, null, (err, result) ->
				if !err and result.d.length > 0
					hash = result.d[0].password
					userId = result.d[0].id
					compare(password, hash, (err, res) ->
						if res
							sbvrUtils.getUserPermissions(userId, (err, permissions) ->
								if err?
									done(null, false)
								else
									done(null,
										username: username
										permissions: permissions
									)
							)
						else
							done(null, false)
					)
				else
					done(null, false)
			)

		handleAuth = (req, res, user) ->
			if req.xhr is true
				if user is false
					res.send(401)
				else
					res.send(200)
			else
				if user is false
					res.redirect(options.failureRedirect)
				else
					res.redirect(options.successRedirect)

		if passport?
			compare = require('bcrypt').compare
			LocalStrategy = require('passport-local').Strategy
			app.post options.loginUrl, (req, res, next) ->
				passport.authenticate('local', (err, user) ->
					handleAuth(req, res, user)
				)(req, res, next)

			passport.serializeUser (user, done)  ->
				done(null, user)

			passport.deserializeUser (user, done) ->
				done(null, user)

			passport.use(new LocalStrategy(checkPassword))
		else
			compare = (value, hash, callback) ->
				callback(null, value == hash)
			do ->
				_user = false
				app.post options.loginUrl, (req, res, next) ->
					checkPassword req.body.username, req.body.password, (err, user) ->
						_user = user
						handleAuth(req, res, user)

		return exports
)

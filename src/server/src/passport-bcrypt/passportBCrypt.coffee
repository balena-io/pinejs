define ['bluebird'], (Promise) ->
	return (options, sbvrUtils, app, passport) ->
		exports = {}
		checkPassword = (username, password, done) ->
			sbvrUtils.runURI('GET', "/Auth/user?$filter=user/username eq '" + username + "'")
			.then((result) ->
				if result.d.length is 0
					throw new Error('User not found')
				hash = result.d[0].password
				userId = result.d[0].id
				Promise.promisify(compare)(password, hash)
				.then((res) ->
					if !res
						throw new Error('Passwords do not match')
					sbvrUtils.getUserPermissions(userId)
					.then((permissions) ->
						return {
							id: userId
							username: username
							permissions: permissions
						}
					)
				)
			).catch(->
				return false
			).done((user) ->
				done(null, user)
			)

		handleAuth = (req, res, user) ->
			if user is false
				if req.xhr is true
					res.send(401)
				else
					res.redirect(options.failureRedirect)
			else
				req.login(user, (err) ->
					if err
						console.error('Error creating session', err, err.stack)
						res.send(500)
					else if req.xhr is true
						res.send(200)
					else
						res.redirect(options.successRedirect)
				)

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

		app.get options.logoutUrl, (req, res) ->
			req.logout()
			res.redirect('/')

		return exports

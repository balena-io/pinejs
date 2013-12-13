define ['bluebird'], (Promise) ->
	return (options, sbvrUtils, app, passport) ->
		checkPassword = (username, password, done) ->
			sbvrUtils.checkPassword()
			.catch(->
				return false
			).done (user) ->
				done(null, user)

		handleAuth = (req, res, user) ->
			if user is false
				if req.xhr is true
					res.send(401)
				else
					res.redirect(options.failureRedirect)
			else
				req.login user, (err) ->
					if err
						console.error('Error creating session', err, err.stack)
						res.send(500)
					else if req.xhr is true
						res.send(200)
					else
						res.redirect(options.successRedirect)

		if passport?
			compare = Promise.promisify(require('bcrypt').compare)
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
			compare = (value, hash) ->
				Promise.fulfilled(value == hash)
			do ->
				_user = false
				app.post options.loginUrl, (req, res, next) ->
					checkPassword req.body.username, req.body.password, (err, user) ->
						_user = user
						handleAuth(req, res, user)

		app.get options.logoutUrl, (req, res) ->
			req.logout()
			res.redirect('/')

		return

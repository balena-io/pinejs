###
To generate a hashed password we can use this line:
password = bcrypt.encrypt_sync(password, bcrypt.gen_salt_sync())

CREATE TABLE users (
	username VARCHAR(50) NOT NULL PRIMARY KEY,
	password CHAR(60) NOT NULL
);
###

define(->
	return (options, sbvrUtils, app, passport) ->
		exports = {}
		checkPassword = (username, password, done) ->
			sbvrUtils.runURI('GET', '/user/user?$filter=user/username eq ' + username, [{}], null,
				(result) ->
					if result.d.length > 0
						hash = result.d[0].password
						compare(password, hash, (err, res) ->
							if res
								done(null, username)
							else
								done(null, false)
						)
					else
						done(null, false)
				(errors) ->
					done(null, false)
			)

		if passport?
			compare = require('bcrypt').compare
			LocalStrategy = require('passport-local').Strategy
			app.post(options.loginUrl, passport.authenticate('local', {failureRedirect: options.failureRedirect}), (req, res, next) ->
				res.redirect(options.successRedirect)
			)
			passport.serializeUser( (user, done)  ->
				done(null, user)
			)

			passport.deserializeUser( (user, done) ->
				done(null, user)
			)

			passport.use(new LocalStrategy(checkPassword))

			exports.isAuthed = (req, res, next) ->
				if req.isAuthenticated()
					next()
				else
					res.redirect(options.failureRedirect)
		else
			compare = (value, hash, callback) ->
				callback(null, value == hash)
			do() ->
				_user = false
				app.post(options.loginUrl, (req, res, next) ->
					checkPassword(req.body.username, req.body.password, (errors, user) ->
						_user = user
						if res == false
							res.redirect(options.failureRedirect)
						else
							res.redirect(options.successRedirect)
					)
				)

				exports.isAuthed = (req, res, next) ->
					# For local (dev) we just assume we are authed 
					next()
					# if _user != false
						# next()
					# else
						# res.redirect(options.failureRedirect)

		return exports
)

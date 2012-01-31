###
To generate a hashed password we can use this line:
password = bcrypt.encrypt_sync(password, bcrypt.gen_salt_sync())

CREATE TABLE users (
	username VARCHAR(50) NOT NULL PRIMARY KEY,
	password CHAR(60) NOT NULL
);
###

define((requirejs, exports, module) ->
	bcrypt = require('bcrypt')
	LocalStrategy = require('passport-local').Strategy;

	exports.init = (passport, db) ->
		passport.serializeUser( (user, done)  ->
			done(null, user)
		)

		passport.deserializeUser( (user, done) ->
			done(null, user)
		)

		passport.use(new LocalStrategy(
			(username, password, done) ->
				db.transaction( (tx) ->
					tx.executeSql('SELECT password FROM users WHERE username = ?', [username],
						(tx, result) ->
							if result.rows.length != 0 && bcrypt.compare_sync(password, result.rows.item(0).password)
								done(null, username)
							else 
								done(null, false)
						(tx, err) ->
							done(null, false)
					)
				)
		))
	
	

	exports.isAuthed = (req, res, next) ->
		if (req.isAuthenticated())
			next()
		else
			res.redirect('/login.html')
	return exports
)
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
					# password = bcrypt.encrypt_sync(password, bcrypt.gen_salt_sync()) # To generate a hashed password we can use this line.
					tx.executeSql('SELECT password FROM users WHERE username = ?', [username],
						(tx, result) ->
							if result.rows.length != 0 && bcrypt.compare_sync(password, result.rows.item(i).password)
								done(null, username)
							else 
								done(null, false)
						(tx, err) ->
							done(null, false)
					)
				)
		))
	return exports
)
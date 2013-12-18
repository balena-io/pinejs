define [
	'exports'
	'has'
	'cs!passport-bcrypt/passportBCrypt'
], (exports, has, passportBCrypt) ->
	exports.setup = (app, requirejs, sbvrUtils, db) ->
		if has 'ENV_NODEJS'
			passport = require('passport')
		passportBCrypt = passportBCrypt({
				loginUrl: '/login'
				logoutUrl: '/logout'
				failureRedirect: '/login.html'
				successRedirect: '/'
			}, sbvrUtils, app, passport)
	return exports
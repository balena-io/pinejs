define [
	'exports'
	'has'
	'cs!passport-platform/passport-platform'
], (exports, has, passportPlatform) ->
	exports.setup = (app, requirejs, sbvrUtils, db) ->
		if has 'ENV_NODEJS'
			passport = require('passport')
		passportPlatform({
				loginUrl: '/login'
				logoutUrl: '/logout'
				failureRedirect: '/login.html'
				successRedirect: '/'
			}, sbvrUtils, app, passport)
	return exports
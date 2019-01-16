import * as _bodyParser from 'body-parser'
import * as _compression from 'compression'
import * as _cookieParser from 'cookie-parser'
import * as _expressSession from 'express-session'
import * as _methodOverride from 'method-override'
import * as _multer from 'multer'
import * as _passport from 'passport'
import * as _path from 'path'
import * as _serveStatic from 'serve-static'

import * as Pinejs from './module'

import * as Promise from 'bluebird'
import * as passportPinejs from '../passport-pinejs/passport-pinejs'

import * as sbvrUtils from '../sbvr-api/sbvr-utils'
import PinejsSessionStore = require('../pinejs-session-store/pinejs-session-store')
export { sbvrUtils, PinejsSessionStore }

import * as express from 'express'

const app = express()

switch(app.get('env')) {
	case 'production':
		console.log = () => {}
	break
	case 'development':
		Promise.longStackTraces()
}

if (!process.browser) {
	// tslint:disable:no-var-requires
	const passport: typeof _passport = require('passport')
	const path: typeof _path = require('path')
	const compression: typeof _compression = require('compression')
	const serveStatic: typeof _serveStatic = require('serve-static')
	const cookieParser: typeof _cookieParser = require('cookie-parser')
	const bodyParser: typeof _bodyParser = require('body-parser')
	const multer: typeof _multer = require('multer')
	const methodOverride: typeof _methodOverride = require('method-override')
	const expressSession: typeof _expressSession = require('express-session')
	// tslint:enable:no-var-requires

	app.use(compression())

	const root = process.argv[2] || __dirname
	app.use('/', serveStatic(path.join(root, 'static')))

	app.use(cookieParser())
	app.use(bodyParser())
	app.use(multer().any())
	app.use(methodOverride())
	app.use(expressSession({
		secret: 'A pink cat jumped over a rainbow',
		store: new PinejsSessionStore(),
	}))
	app.use(passport.initialize())
	app.use(passport.session())

	app.use((req, res, next) => {
		const origin = req.get('Origin') || '*'
		res.header('Access-Control-Allow-Origin', origin)
		res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE, OPTIONS, HEAD')
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Application-Record-Count, MaxDataServiceVersion, X-Requested-With')
		res.header('Access-Control-Allow-Credentials', 'true')
		next()
	})

	app.use((req, _res, next) => {
		console.log('%s %s', req.method, req.url)
		next()
	})
}

export const initialised = Pinejs.init(app)
.then((configLoader) =>
	Promise.all([
		configLoader.loadConfig(passportPinejs.config),
		configLoader.loadConfig(PinejsSessionStore.config),
	])
).then(() => {
	if (typeof process === 'undefined' || process == null || !process.env.DISABLE_DEFAULT_AUTH) {
		app.post('/login', passportPinejs.login((err, user, req, res) => {
			if (err) {
				console.error('Error logging in', err, err.stack)
				res.sendStatus(500)
			} else if (user === false) {
				if (req.xhr === true) {
					res.sendStatus(401)
				} else {
					res.redirect('/login.html')
				}
			} else {
				if (req.xhr === true) {
					res.sendStatus(200)
				} else {
					res.redirect('/')
				}
			}
		}))

		app.get('/logout', passportPinejs.logout, (_req, res) => {
			res.redirect('/')
		})
	}
}).then(() => {
	app.listen(process.env.PORT || 1337, () => {
		console.info('Server started')
	})
}).catch((err) => {
	console.error('Error initialising server', err, err.stack)
	process.exit(1)
})

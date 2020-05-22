import type * as BodyParser from 'body-parser';
import type * as Compression from 'compression';
import type * as CookieParser from 'cookie-parser';
import type * as ExpressSession from 'express-session';
import type * as MethodOverride from 'method-override';
import type * as Multer from 'multer';
import type * as Passport from 'passport';
import type * as Path from 'path';
import type * as ServeStatic from 'serve-static';

import * as Pinejs from './module';

import * as passportPinejs from '../passport-pinejs/passport-pinejs';

import { PinejsSessionStore } from '../pinejs-session-store/pinejs-session-store';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
export { sbvrUtils, PinejsSessionStore };

import * as express from 'express';

const app = express();

switch (app.get('env')) {
	case 'production':
		console.log = () => {
			// noop
		};
		break;
}

if (!process.browser) {
	// tslint:disable:no-var-requires
	const passport: typeof Passport = require('passport');
	const path: typeof Path = require('path');
	const compression: typeof Compression = require('compression');
	const serveStatic: typeof ServeStatic = require('serve-static');
	const cookieParser: typeof CookieParser = require('cookie-parser');
	const bodyParser: typeof BodyParser = require('body-parser');
	const multer: typeof Multer = require('multer');
	const methodOverride: typeof MethodOverride = require('method-override');
	const expressSession: typeof ExpressSession = require('express-session');
	// tslint:enable:no-var-requires

	app.use(compression());

	const root = process.argv[2] || __dirname;
	app.use('/', serveStatic(path.join(root, 'static')));

	app.use(cookieParser());
	app.use(bodyParser());
	app.use(multer().any());
	app.use(methodOverride());
	app.use(
		expressSession({
			secret: 'A pink cat jumped over a rainbow',
			store: new PinejsSessionStore(),
		}),
	);
	app.use(passport.initialize());
	app.use(passport.session());

	app.use((req, res, next) => {
		const origin = req.get('Origin') || '*';
		res.header('Access-Control-Allow-Origin', origin);
		res.header(
			'Access-Control-Allow-Methods',
			'GET, PUT, POST, PATCH, DELETE, OPTIONS, HEAD',
		);
		res.header(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, Application-Record-Count, MaxDataServiceVersion, X-Requested-With',
		);
		res.header('Access-Control-Allow-Credentials', 'true');
		next();
	});

	app.use((req, _res, next) => {
		console.log('%s %s', req.method, req.url);
		next();
	});
}

export const initialised = Pinejs.init(app)
	.then(async (configLoader) => {
		await Promise.all([
			configLoader.loadConfig(passportPinejs.config),
			configLoader.loadConfig(PinejsSessionStore.config),
		]);

		if (
			typeof process === 'undefined' ||
			process == null ||
			!process.env.DISABLE_DEFAULT_AUTH
		) {
			app.post(
				'/login',
				passportPinejs.login((err, user, req, res) => {
					if (err) {
						console.error('Error logging in', err, err.stack);
						res.sendStatus(500);
					} else if (user === false) {
						if (req.xhr === true) {
							res.sendStatus(401);
						} else {
							res.redirect('/login.html');
						}
					} else {
						if (req.xhr === true) {
							res.sendStatus(200);
						} else {
							res.redirect('/');
						}
					}
				}),
			);

			app.get('/logout', passportPinejs.logout, (_req, res) => {
				res.redirect('/');
			});
		}

		app.listen(process.env.PORT || 1337, () => {
			console.info('Server started');
		});
	})
	.catch((err) => {
		console.error('Error initialising server', err, err.stack);
		process.exit(1);
	});

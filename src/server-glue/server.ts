import type BodyParser from 'body-parser';
import type Compression from 'compression';
import type CookieParser from 'cookie-parser';
import type ExpressSession from 'express-session';
import type MethodOverride from 'method-override';
import type * as Passport from 'passport';
import type * as Path from 'path';
import type ServeStatic from 'serve-static';

import * as Pinejs from './module';
export { sbvrUtils, PinejsSessionStore } from './module';

export { ExtendedSBVRParser } from '../extended-sbvr-parser/extended-sbvr-parser';

import { mountLoginRouter } from '../passport-pinejs/mount-login-router';

import express from 'express';

const app = express();

switch (app.get('env')) {
	case 'production':
		console.log = () => {
			// noop
		};
		break;
}

if (!process.browser) {
	/* eslint-disable @typescript-eslint/no-var-requires */
	const passport: typeof Passport = require('passport');
	const path: typeof Path = require('path');
	const compression: typeof Compression = require('compression');
	const serveStatic: typeof ServeStatic = require('serve-static');
	const cookieParser: typeof CookieParser = require('cookie-parser');
	const bodyParser: typeof BodyParser = require('body-parser');
	const methodOverride: typeof MethodOverride = require('method-override');
	const expressSession: typeof ExpressSession = require('express-session');
	/* eslint-enable @typescript-eslint/no-var-requires */

	app.use(compression());

	const root = process.argv[2] || __dirname;
	app.use('/', serveStatic(path.join(root, 'static')));

	app.use(cookieParser());
	app.use(bodyParser());
	app.use(methodOverride());
	app.use(
		expressSession({
			secret: 'A pink cat jumped over a rainbow',
			store: new Pinejs.PinejsSessionStore(),
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
		await mountLoginRouter(configLoader, app);

		app.listen(process.env.PORT || 1337, () => {
			console.info('Server started');
		});
	})
	.catch((err) => {
		console.error('Error initialising server', err);
		process.exit(1);
	});

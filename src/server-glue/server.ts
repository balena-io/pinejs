import * as Pinejs from './module.js';
export { sbvrUtils, PinejsSessionStore } from './module.js';

export { ExtendedSBVRParser } from '../extended-sbvr-parser/extended-sbvr-parser.js';

import { mountLoginRouter } from '../passport-pinejs/mount-login-router.js';

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
	const { default: passport } = await import('passport');
	const { default: path } = await import('path');
	const { default: compression } = await import('compression');
	const { default: serveStatic } = await import('serve-static');
	const { default: cookieParser } = await import('cookie-parser');
	const { default: bodyParser } = await import('body-parser');
	const { default: methodOverride } = await import('method-override');
	const { default: expressSession } = await import('express-session');

	app.use(compression());

	const root = process.argv[2] || import.meta.dirname;
	app.use('/', serveStatic(path.join(root, 'static')));

	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use((req, _res, next) => {
		// Ensure req.body is always defined to match body-parser v1 / express v4 behavior
		// TODO: Remove the reliance on req.body always being defined
		req.body ??= {};
		next();
	});
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
		const origin = req.get('Origin') ?? '*';
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

		app.listen(process.env.PORT ?? 1337, () => {
			console.info('Server started');
		});
	})
	.catch((err) => {
		console.error('Error initialising server', err);
		process.exit(1);
	});

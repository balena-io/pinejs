import type Express from 'express';
import type Passport from 'passport';
import type PassportLocal from 'passport-local';
import type * as ConfigLoader from '../config-loader/config-loader.js';
import type { User } from '../sbvr-api/sbvr-utils.js';

import * as permissions from '../sbvr-api/permissions.js';

// Returns a middleware that will handle logging in using `username` and `password` body properties
export let login: (
	fn: (
		err: any,
		user: object | null | false | undefined,
		req: Express.Request,
		res: Express.Response,
		next: Express.NextFunction,
	) => void,
) => Express.RequestHandler;

// Returns a middleware that logs the user out and then calls next()
export let logout: Express.RequestHandler;

export const checkPassword: PassportLocal.VerifyFunction = async (
	username,
	password,
	done: (error: undefined, user?: any) => void,
) => {
	try {
		const result = await permissions.checkPassword(username, password);
		done(undefined, result);
	} catch {
		done(undefined, false);
	}
};

const setup: ConfigLoader.SetupFunction = async (app: Express.Application) => {
	if (!process.browser) {
		const { default: passport } = await import('passport');
		app.use(passport.initialize());
		app.use(passport.session());

		const { Strategy: LocalStrategy } = await import('passport-local');

		passport.serializeUser((user, done) => {
			done(null, user);
		});

		passport.deserializeUser<User>((user, done) => {
			done(null, user);
		});

		passport.use(new LocalStrategy(checkPassword));

		login = (fn) => (req, res, next) =>
			passport.authenticate('local', ((err, user) => {
				if (err || user == null || user === false) {
					fn(err, user, req, res, next);
					return;
				}
				req.login(user, (error) => {
					fn(error, user, req, res, next);
				});
			}) as Passport.AuthenticateCallback)(req, res, next);

		logout = (req, _res, next) => {
			req.logout((error) => {
				if (error) {
					next(error);
					return;
				}
				next();
			});
		};
	} else {
		let loggedIn = false;
		let loggedInUser: any = null;
		app.use((req, _res, next) => {
			if (loggedIn === false) {
				req.user = loggedInUser;
			}
			next();
		});

		login = (fn) => (req, res, next) => {
			checkPassword(req.body.username, req.body.password, (err, user) => {
				if (user) {
					loggedIn = true;
					loggedInUser = user;
				}
				fn(err, user, req, res, next);
			});
		};

		logout = (req, _res, next) => {
			delete req.user;
			loggedIn = false;
			loggedInUser = null;
			next();
		};
	}
};

export const config: ConfigLoader.Config = {
	models: [
		{
			customServerCode: { setup },
		},
	],
};

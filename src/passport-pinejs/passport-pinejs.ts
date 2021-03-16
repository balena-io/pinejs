import type * as Express from 'express';
import type * as Passport from 'passport';
import type * as PassportLocal from 'passport-local';
import type * as ConfigLoader from '../config-loader/config-loader';

import * as permissions from '../sbvr-api/permissions';

// Returns a middleware that will handle logging in using `username` and `password` body properties
export let login: (
	fn: (
		err: any,
		user: {} | undefined,
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
		const passport: typeof Passport = require('passport');
		app.use(passport.initialize());
		app.use(passport.session());

		const {
			Strategy: LocalStrategy,
		}: typeof PassportLocal = require('passport-local');

		passport.serializeUser((user, done) => {
			done(null, user);
		});

		passport.deserializeUser((user, done) => {
			done(null, user);
		});

		passport.use(new LocalStrategy(checkPassword));

		login = (fn) => (req, res, next) =>
			passport.authenticate('local', (err: any, user?: {}) => {
				if (err || user == null) {
					fn(err, user, req, res, next);
					return;
				}
				req.login(user, (error) => {
					fn(error, user, req, res, next);
				});
			})(req, res, next);

		logout = (req, _res, next) => {
			req.logout();
			next();
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

		login = (fn) => (req, res, next) =>
			checkPassword(req.body.username, req.body.password, (err, user) => {
				if (user) {
					loggedIn = true;
					loggedInUser = user;
				}
				fn(err, user, req, res, next);
			});

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

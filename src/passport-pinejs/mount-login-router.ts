import * as passportPinejs from './passport-pinejs';
import type { Express } from 'express';
import { PinejsSessionStore } from '../pinejs-session-store/pinejs-session-store';
import type { setup } from '../config-loader/config-loader';

export const mountLoginRouter = async (
	configLoader: ReturnType<typeof setup>,
	expressApp: Express,
) => {
	await Promise.all([
		configLoader.loadConfig(passportPinejs.config),
		configLoader.loadConfig(PinejsSessionStore.config),
	]);

	if (
		typeof process === 'undefined' ||
		process == null ||
		!process.env.DISABLE_DEFAULT_AUTH
	) {
		expressApp.post(
			'/login',
			passportPinejs.login((err, user, req, res) => {
				if (err) {
					console.error('Error logging in', err);
					res.status(500).end();
				} else if (user === false) {
					if (req.xhr === true) {
						res.status(401).end();
					} else {
						res.redirect('/login.html');
					}
				} else {
					if (req.xhr === true) {
						res.status(200).end();
					} else {
						res.redirect('/');
					}
				}
			}),
		);

		expressApp.get('/logout', passportPinejs.logout, (_req, res) => {
			res.redirect('/');
		});
	}
};

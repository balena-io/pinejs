import type express from 'express';
import { permissions } from '@balena/pinejs';

export const initRoutes = (app: express.Express) => {
	// Responds with the credentials that authenticated the request
	app.get('/credential', permissions.apiKeyMiddleware, (req, res) => {
		res.json({
			user: req.user?.credential ?? null,
			apiKey: req.apiKey?.credential ?? null,
		});
	});
};

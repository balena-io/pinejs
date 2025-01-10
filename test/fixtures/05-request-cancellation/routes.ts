import type express from 'express';
import onFinished from 'on-finished';
import { sbvrUtils, errors } from '@balena/pinejs';
import { setTimeout } from 'timers/promises';
import { track } from './util.js';

export const initRoutes = (app: express.Express) => {
	app.post('/slow-custom-endpoint', async (req, res) => {
		try {
			const response = await sbvrUtils.db.transaction(async (tx) => {
				await track('POST /slow-custom-endpoint tx started');
				const tryCancelRequest = () => {
					if (!tx.isClosed()) {
						void tx.rollback();
					}
				};
				switch (req.query.event) {
					case 'on-close':
						res.on('close', tryCancelRequest);
						break;
					case 'on-finished':
						onFinished(res, tryCancelRequest);
						break;
					default:
						throw new errors.BadRequestError(`query.event: ${req.query.event}`);
				}

				const apiTx = sbvrUtils.api.example.clone({
					passthrough: { req, tx },
				});
				const slowResource = await apiTx.post({
					resource: 'slow_resource',
					body: {
						name: req.body.name,
					},
				});
				await track('POST /slow-custom-endpoint POST-ed slow_resource record');

				await setTimeout(300);
				await track('POST /slow-custom-endpoint spent some time waiting');

				await apiTx.patch({
					resource: 'slow_resource',
					id: slowResource.id,
					body: {
						note: 'I am a note from the custom endpoint',
					},
				});
				await track(
					'POST /slow-custom-endpoint PATCH-ed the slow_resource note',
				);

				const result = await apiTx.get({
					resource: 'slow_resource',
					id: slowResource.id,
				});
				await track('POST /slow-custom-endpoint re-GET result finished');

				return result;
			});
			await track('POST /slow-custom-endpoint tx finished');

			res.status(201).json(response);
		} catch (err) {
			if (err instanceof Error && sbvrUtils.handleHttpErrors(req, res, err)) {
				await track(`POST /slow-custom-endpoint caught: ${err.name}`);
				return;
			}
			res.status(500).send();
		}
	});
};

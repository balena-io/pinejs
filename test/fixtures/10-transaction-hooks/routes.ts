import type express from 'express';
import { sbvrUtils } from '@balena/pinejs';

const trackHook = async (hookName: string, testResourceId: number) => {
	return await sbvrUtils.api.test.post({
		resource: 'hook_log',
		body: {
			hook_name: hookName,
			test_resource_id: testResourceId,
		},
	});
};

export const initRoutes = (app: express.Express) => {
	app.post('/test-tx-hooks', async (req, res) => {
		try {
			const response = await sbvrUtils.db.transaction(async (tx) => {
				const shouldRollback = req.body.shouldRollback === true;
				const shouldFailPreCommit = req.body.shouldFailPreCommit === true;

				tx.on('end', () => {
					void trackHook('end', req.body.testResourceId);
				});

				tx.on('rollback', () => {
					void trackHook('rollback', req.body.testResourceId);
				});

				tx.on('preCommit', async () => {
					await trackHook('preCommit', req.body.testResourceId);
					if (shouldFailPreCommit) {
						throw new Error('PreCommit hook intentionally failed');
					}
				});

				// Execute some SQL to make the transaction meaningful
				const result = await tx.executeSql(
					'INSERT INTO "test resource" ("name") VALUES ($1) RETURNING "id"',
					[req.body.name],
				);

				if (shouldRollback) {
					throw new Error('Transaction intentionally failed');
				}

				return result.rows[0];
			});

			res.status(201).json(response);
		} catch (err) {
			if (err instanceof Error) {
				if (
					err.message === 'Transaction intentionally failed' ||
					err.message === 'PreCommit hook intentionally failed'
				) {
					res.status(400).json({ error: err.message });
					return;
				}
				if (sbvrUtils.handleHttpErrors(req, res, err)) {
					return;
				}
			}
			res.status(500).send();
		}
	});
};

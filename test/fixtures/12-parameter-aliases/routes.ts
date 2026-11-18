import type express from 'express';
import { permissions, sbvrUtils } from '@balena/pinejs';

const passthrough = { req: permissions.root };

const createApiKey = async (key: string, permissionName: string) => {
	const { id: actor } = await sbvrUtils.api.Auth.post({
		resource: 'actor',
		passthrough,
		options: { returnResource: false },
	});
	const { id: permission } = await sbvrUtils.api.Auth.post({
		resource: 'permission',
		passthrough,
		body: { name: permissionName },
		options: { returnResource: false },
	});
	const { id: apiKey } = await sbvrUtils.api.Auth.post({
		resource: 'api_key',
		passthrough,
		body: { key, is_of__actor: actor },
		options: { returnResource: false },
	});
	await sbvrUtils.api.Auth.post({
		resource: 'api_key__has__permission',
		passthrough,
		body: { api_key: apiKey, permission },
		options: { returnResource: false },
	});
	return actor;
};

const errorMessage = (err: unknown) =>
	err instanceof Error ? err.message : `${err}`;

export const initRoutes = (app: express.Express) => {
	app.post('/seed', async (_req, res) => {
		try {
			const readActor = await createApiKey('read-key', 'example.note.read');
			const spacedActor = await createApiKey(
				"a key's 100% spaced",
				'example.note.create',
			);
			res.status(201).json({ readActor, spacedActor });
		} catch (err) {
			res.status(500).json({ error: errorMessage(err) });
		}
	});

	app.post('/check-api-key', async (req, res) => {
		try {
			const { actor, permissions: names } = await permissions.checkApiKey(
				req.body.key,
			);
			res.status(200).json({ actor, permissions: names });
		} catch (err) {
			res.status(401).json({ error: errorMessage(err) });
		}
	});
};

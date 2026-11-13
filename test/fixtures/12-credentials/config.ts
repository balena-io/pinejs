import type { ConfigLoader } from '@balena/pinejs';
import { fileURLToPath } from 'node:url';

export default {
	models: [
		{
			modelName: 'Auth',
			modelFile: fileURLToPath(
				import.meta.resolve('@balena/pinejs/out/sbvr-api/user.sbvr'),
			),
			apiRoot: 'Auth',
		},
	],
	users: [
		{
			username: 'guest',
			password: ' ',
			permissions: ['resource.all'],
		},
	],
} satisfies ConfigLoader.Config;

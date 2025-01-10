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
		{
			modelName: 'tasks',
			modelFile: fileURLToPath(
				import.meta.resolve('@balena/pinejs/out/tasks/tasks.sbvr'),
			),
			apiRoot: 'tasks',
		},
		{
			modelName: 'example',
			modelFile: import.meta.dirname + '/example.sbvr',
			apiRoot: 'example',
		},
	],
	users: [
		{
			username: 'guest',
			password: ' ',
			permissions: ['resource.all'],
		},
	],
} as ConfigLoader.Config;

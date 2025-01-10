import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = import.meta.dirname + '/example.sbvr';
const migrationsPath = import.meta.dirname + '/01-migrations/migrations';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
			migrationsPath,
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

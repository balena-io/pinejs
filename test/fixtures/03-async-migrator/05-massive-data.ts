import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = __dirname + '/example.sbvr';
const migrationsPath = __dirname + '/05-massive-data/migrations';

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

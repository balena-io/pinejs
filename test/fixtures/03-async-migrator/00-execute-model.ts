import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = import.meta.dirname + '/example.sbvr';
const initSqlPath = import.meta.dirname + '/init-data.sql';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
			initSqlPath,
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

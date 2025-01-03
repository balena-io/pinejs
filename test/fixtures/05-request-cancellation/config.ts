import type { ConfigLoader } from '../../../src/server-glue/module.js';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = import.meta.dirname + '/example.sbvr';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
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

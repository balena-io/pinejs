import type { ConfigLoader } from '../../../src/server-glue/module.js';

export default {
	models: [
		{
			apiRoot: 'example',
			modelFile: __dirname + '/example.sbvr',
			modelName: 'example',
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

import type { ConfigLoader } from '../../../src/server-glue/module.js';

export default {
	models: [
		{
			modelName: 'Auth',
			modelFile: import.meta.dirname + '/../../../src/sbvr-api/user.sbvr',
			apiRoot: 'Auth',
		},
		{
			modelName: 'tasks',
			modelFile: import.meta.dirname + '/../../../src/tasks/tasks.sbvr',
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

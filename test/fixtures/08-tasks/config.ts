import type { ConfigLoader } from '../../../src/server-glue/module';

export default {
	models: [
		{
			modelName: 'Auth',
			modelFile: __dirname + '/../../../src/sbvr-api/user.sbvr',
			apiRoot: 'Auth',
		},
		{
			modelName: 'tasks',
			modelFile: __dirname + '/../../../src/tasks/tasks.sbvr',
			apiRoot: 'tasks',
		},
		{
			modelName: 'example',
			modelFile: __dirname + '/example.sbvr',
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

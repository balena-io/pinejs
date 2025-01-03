import type { ConfigLoader } from '../../..';

export default {
	models: [
		{
			modelName: 'Auth',
			modelFile: __dirname + '/../../../out/sbvr-api/user.sbvr',
			apiRoot: 'Auth',
		},
		{
			modelName: 'tasks',
			modelFile: __dirname + '/../../../out/tasks/tasks.sbvr',
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

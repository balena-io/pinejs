import type { ConfigLoader } from '@balena/pinejs';

export default {
	models: [
		{
			modelName: 'Auth',
			modelFile: require.resolve('@balena/pinejs/out/sbvr-api/user.sbvr'),
			apiRoot: 'Auth',
		},
		{
			modelName: 'tasks',
			modelFile: require.resolve('@balena/pinejs/out/tasks/tasks.sbvr'),
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

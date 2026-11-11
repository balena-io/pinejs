import type { ConfigLoader } from '@balena/pinejs';

export default {
	models: [
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
			permissions: [],
		},
	],
} satisfies ConfigLoader.Config;

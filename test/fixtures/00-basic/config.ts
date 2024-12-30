import type { ConfigLoader } from '@balena/pinejs';

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

import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'test';
const modelName = 'test';
const modelFile = import.meta.dirname + '/test.sbvr';

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

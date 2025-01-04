import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'university';
const modelName = 'university';
const modelFile = __dirname + '/university.sbvr';

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

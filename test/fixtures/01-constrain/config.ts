import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'university';
const modelName = 'university';
const modelFile = import.meta.dirname + '/university.sbvr';

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

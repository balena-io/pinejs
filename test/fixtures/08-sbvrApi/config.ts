import type { ConfigLoader } from '../../../src/server-glue/module';

const apiRoot = 'basic';
const modelName = 'basic';
const modelFile = __dirname + '/basic.sbvr';

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

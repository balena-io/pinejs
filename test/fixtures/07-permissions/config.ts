import type { ConfigLoader } from '../../../out/server-glue/module';

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
			permissions: ['university.student.read'],
		},
		{
			username: 'admin',
			password: 'admin',
			permissions: ['resource.all'],
		},
	],
} as ConfigLoader.Config;

import type { ConfigLoader } from '../../..';

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

import type { ConfigLoader } from '../../../src/server-glue/module';

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
			permissions: ['university.faculty.read'],
		},
		{
			username: 'student',
			password: 'student',
			permissions: [
				'university.student.read',
				'university.student.create',
				'university.student.update',
			],
		},
		{
			username: 'admin',
			password: 'admin',
			permissions: ['resource.all'],
		},
	],
} as ConfigLoader.Config;

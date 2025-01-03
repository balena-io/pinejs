import { resolve } from 'path';
import type { ConfigLoader } from '../../../..';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = resolve(__dirname, '../example.sbvr');
const initSqlPath = __dirname + '/init-data.sql';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
			initSqlPath,
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

import type { ConfigLoader } from '../../../src/server-glue/module';

const apiRoot = 'university';
const modelName = 'university';
const modelFile = __dirname + '/university.sbvr';

import { v1AbstractSqlModel, v1Translations } from './translations/v1';
import { v2AbstractSqlModel, v2Translations } from './translations/v2';
import { v3AbstractSqlModel, v3Translations } from './translations/v3';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
		},
		{
			apiRoot: 'v3',
			modelName: 'v3',
			abstractSql: v3AbstractSqlModel,
			translateTo: 'university',
			translations: v3Translations,
		},
		{
			apiRoot: 'v2',
			modelName: 'v2',
			abstractSql: v2AbstractSqlModel,
			translateTo: 'v3',
			translations: v2Translations,
		},
		{
			apiRoot: 'v1',
			modelName: 'v1',
			abstractSql: v1AbstractSqlModel,
			translateTo: 'v2',
			translations: v1Translations,
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

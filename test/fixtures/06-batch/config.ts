import { AbstractSqlQuery } from '@balena/abstract-sql-compiler';
import { getAbstractSqlModelFromFile } from '../../../src/bin/utils';
import type { ConfigLoader } from '../../../src/server-glue/module';

const apiRoot = 'university';
const modelName = 'university';
const modelFile = __dirname + '/university.sbvr';

import { v1AbstractSqlModel, v1Translations } from './translations/v1';

export const abstractSql = getAbstractSqlModelFromFile(modelFile);

abstractSql.tables['student'].fields.push({
	fieldName: 'computed field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'latest_computed_field'] as AbstractSqlQuery,
});

export default {
	models: [
		{
			modelName,
			abstractSql,
			apiRoot,
		},
		{
			apiRoot: 'v1',
			modelName: 'v1',
			abstractSql: v1AbstractSqlModel,
			translateTo: 'university',
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

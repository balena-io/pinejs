import type { AbstractSqlQuery } from '@balena/abstract-sql-compiler';
import { getAbstractSqlModelFromFile } from '@balena/pinejs/out/bin/utils';
import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'university';
const modelName = 'university';
const modelFile = __dirname + '/university.sbvr';

import { v1AbstractSqlModel, v1Translations } from './translations/v1';
import { v2AbstractSqlModel, v2Translations } from './translations/v2';
import { v3AbstractSqlModel, v3Translations } from './translations/v3';
import { v4AbstractSqlModel } from './translations/v4';
import { v5AbstractSqlModel } from './translations/v5';

export const abstractSql = getAbstractSqlModelFromFile(modelFile, undefined);

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
			apiRoot: 'v5',
			modelName: 'v5',
			abstractSql: v5AbstractSqlModel,
			translateTo: 'university',
			translations: {},
		},
		{
			apiRoot: 'v4',
			modelName: 'v4',
			abstractSql: v4AbstractSqlModel,
			translateTo: 'v5',
			translations: {},
		},
		{
			apiRoot: 'v3',
			modelName: 'v3',
			abstractSql: v3AbstractSqlModel,
			translateTo: 'v4',
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

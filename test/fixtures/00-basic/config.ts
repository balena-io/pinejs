import { readFileSync } from 'fs';
import type { AbstractSqlModel } from '@balena/abstract-sql-compiler';
import type { ConfigLoader } from '../../../src/server-glue/module';
import * as sbvrUtils from '../../../src/sbvr-api/sbvr-utils';

const generateAbstractSqlModel = (seModelPath: string): AbstractSqlModel => {
	const seModel = readFileSync(seModelPath, 'utf8');
	const lfModel = sbvrUtils.generateLfModel(seModel);
	return sbvrUtils.generateAbstractSqlModel(lfModel);
};

const apiRoot = 'example';
const modelName = 'example';
const abstractSql = generateAbstractSqlModel(__dirname + '/example.sbvr');

export default {
	models: [
		{
			modelName,
			abstractSql,
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

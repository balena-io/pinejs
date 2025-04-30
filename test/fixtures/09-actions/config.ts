import type { ConfigLoader } from '@balena/pinejs';
import { v1AbstractSqlModel, v1Translations } from './translations/v1/index.js';

const apiRoot = 'actionsUniversity';
const modelName = 'actionsUniversity';
const modelFile = import.meta.dirname + '/actionsUniversity.sbvr';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
		},
		{
			apiRoot: 'v1actionsUniversity',
			modelName: 'v1actionsUniversity',
			abstractSql: v1AbstractSqlModel,
			translateTo: 'actionsUniversity',
			translations: v1Translations,
		},
	],
	users: [
		{
			username: 'teacher',
			password: 'teacher',
			permissions: [
				'actionsUniversity.student.read',
				'actionsUniversity.student.create',
				'actionsUniversity.student.update',
				'actionsUniversity.student.delete',
			],
		},
		{
			username: 'admin',
			password: 'admin',
			permissions: [
				'actionsUniversity.student.read',
				'actionsUniversity.student.create',
				'actionsUniversity.student.update',
				'actionsUniversity.student.delete',
				'actionsUniversity.student.promoteToNextSemester',
			],
		},
		{
			username: 'guest',
			password: ' ',
			permissions: [],
		},
	],
} as ConfigLoader.Config;

import type { ConfigLoader } from '../../../../../src/server-glue/module';
import { getAbstractSqlModelFromFile } from '../../../../../src/bin/utils';
import {
	AbstractSqlQuery,
	SelectQueryNode,
} from '@balena/abstract-sql-compiler';

export const v2AbstractSqlModel = getAbstractSqlModelFromFile(
	__dirname + '/university.sbvr',
);

export const toVersion = 'v3';

v2AbstractSqlModel.relationships['version'] = { v2: {} };

v2AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'test field',
	dataType: 'Text',
	required: false,
	computed: ['Text', 'v2_test_field'] as AbstractSqlQuery,
});

export const v2Translations: ConfigLoader.Model['translations'] = {
	student: {
		'studies at-campus': [
			'SelectQuery',
			['Select', [['ReferencedField', 'student.studies at-campus', 'name']]],
			[
				'From',
				[
					'Alias',
					['Resource', `campus$${toVersion}`],
					'student.studies at-campus',
				],
			],
			[
				'Where',
				[
					'Equals',
					['ReferencedField', 'student', 'studies at-campus'],
					['ReferencedField', 'student.studies at-campus', 'id'],
				],
			],
		] as SelectQueryNode,
	},
};

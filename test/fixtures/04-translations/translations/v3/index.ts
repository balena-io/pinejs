import type { ConfigLoader } from '../../../../../src/server-glue/module';
import { getAbstractSqlModelFromFile } from '../../../../../src/bin/utils';
import { AbstractSqlQuery } from '@balena/abstract-sql-compiler';

export const v3AbstractSqlModel = getAbstractSqlModelFromFile(
	__dirname + '/university.sbvr',
);

export const toVersion = 'university';

v3AbstractSqlModel.relationships['version'] = { v3: {} };

v3AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'test field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'v3_test_field'] as AbstractSqlQuery,
});

export const v3Translations: ConfigLoader.Model['translations'] = {
	campus: {
		$toResource: `faculty$${toVersion}`,
	},
	student: {
		'studies at-campus': 'studies at-faculty',
		'matrix number': [
			'Add',
			['ReferencedField', `faculty$${toVersion}`, 'matrix number'],
			['Number', 1000],
		],
	},
};

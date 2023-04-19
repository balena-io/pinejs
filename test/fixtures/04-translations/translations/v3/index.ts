import type { ConfigLoader } from '../../../../../src/server-glue/module';
import { getAbstractSqlModelFromFile } from '../../../../../src/bin/utils';
import { AbstractSqlQuery } from '@balena/abstract-sql-compiler';

export const v3AbstractSqlModel = getAbstractSqlModelFromFile(
	__dirname + '/university.sbvr',
);

export const toVersion = 'university';

v3AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'computed field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'v3_computed_field'] as AbstractSqlQuery,
});

v3AbstractSqlModel.relationships['version'] = { v3: {} };

export const v3Translations: ConfigLoader.Model['translations'] = {
	campus: {
		$toResource: `faculty$${toVersion}`,
	},
	student: {
		'studies at-campus': 'studies at-faculty',
	},
};

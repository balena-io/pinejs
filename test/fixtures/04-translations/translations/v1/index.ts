import type { ConfigLoader } from '../../../../..';
import { getAbstractSqlModelFromFile } from '../../../../../out/bin/utils';
import type { AbstractSqlQuery } from '@balena/abstract-sql-compiler';

export const toVersion = 'v2';

export const v1AbstractSqlModel = getAbstractSqlModelFromFile(
	__dirname + '/university.sbvr',
	undefined,
);

v1AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'computed field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'v1_computed_field'] as AbstractSqlQuery,
});

v1AbstractSqlModel.relationships['version'] = { v1: {} };

export const v1Translations: ConfigLoader.Model['translations'] = {
	student: {
		lastname: 'last name',
	},
};

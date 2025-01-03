import { getAbstractSqlModelFromFile } from '@balena/pinejs/out/bin/utils';
import type { AbstractSqlQuery } from '@balena/abstract-sql-compiler';

export const v5AbstractSqlModel = getAbstractSqlModelFromFile(
	__dirname + '/university.sbvr',
	undefined,
);

export const toVersion = 'university';

v5AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'computed field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'v5_computed_field'] as AbstractSqlQuery,
});

v5AbstractSqlModel.relationships['version'] = { v5: {} };

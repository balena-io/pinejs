import { getAbstractSqlModelFromFile } from '@balena/pinejs/out/bin/utils.js';
import type { AbstractSqlQuery } from '@balena/abstract-sql-compiler';

export const v4AbstractSqlModel = await getAbstractSqlModelFromFile(
	import.meta.dirname + '/university.sbvr',
	undefined,
);

export const toVersion = 'v5';

v4AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'computed field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'v4_computed_field'] as AbstractSqlQuery,
});

v4AbstractSqlModel.relationships['version'] = { v4: {} };

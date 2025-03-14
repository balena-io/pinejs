import type { ConfigLoader } from '@balena/pinejs';
import { getAbstractSqlModelFromFile } from '@balena/pinejs/out/bin/utils.js';
import type {
	AbstractSqlQuery,
	SelectQueryNode,
} from '@balena/abstract-sql-compiler';

export const v2AbstractSqlModel = await getAbstractSqlModelFromFile(
	import.meta.dirname + '/university.sbvr',
	undefined,
);

export const toVersion = 'v3';

v2AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'computed field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'v2_computed_field'] as AbstractSqlQuery,
});

v2AbstractSqlModel.relationships['version'] = { v2: {} };

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

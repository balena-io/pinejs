import type { ConfigLoader } from '@balena/pinejs';
import { getAbstractSqlModelFromFile } from '@balena/pinejs/out/bin/utils.js';

export const v3AbstractSqlModel = await getAbstractSqlModelFromFile(
	import.meta.dirname + '/university.sbvr',
	undefined,
);

export const toVersion = 'v4';

v3AbstractSqlModel.tables['student'].fields.push({
	fieldName: 'computed field',
	dataType: 'Text',
	required: false,
	computed: ['EmbeddedText', 'v3_computed_field'],
});

v3AbstractSqlModel.relationships['version'] = { v3: {} };

export const v3Translations: ConfigLoader.Model['translations'] = {
	campus: {
		$toResource: 'faculty',
	},
	student: {
		'studies at-campus': 'studies at-faculty',
	},
};

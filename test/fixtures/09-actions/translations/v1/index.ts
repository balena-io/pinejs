import type { ConfigLoader } from '@balena/pinejs';
import { getAbstractSqlModelFromFile } from '@balena/pinejs/out/bin/utils.js';

export const toVersion = 'actionsUniversity';

export const v1AbstractSqlModel = await getAbstractSqlModelFromFile(
	import.meta.dirname + '/v1actionsUniversity.sbvr',
	undefined,
);

v1AbstractSqlModel.relationships['version'] = { v1actionsUniversity: {} };

export const v1Translations: ConfigLoader.Model['translations'] = {
	student: {
		'current semester': 'semester',
	},
};

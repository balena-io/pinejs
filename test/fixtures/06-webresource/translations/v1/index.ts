import type { ConfigLoader } from '../../../../../src/server-glue/module.js';
import { getAbstractSqlModelFromFile } from '../../../../../src/bin/utils.js';

export const toVersion = 'example';

export const v1AbstractSqlModel = await getAbstractSqlModelFromFile(
	import.meta.dirname + '/example.sbvr',
	undefined,
);

v1AbstractSqlModel.relationships['version'] = { v1: {} };

export const v1Translations: ConfigLoader.Model['translations'] = {
	organization: {
		'other image': 'logo image',
	},
};

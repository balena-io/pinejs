import type { ConfigLoader } from '../../../../../src/server-glue/module';
import { getAbstractSqlModelFromFile } from '../../../../../src/bin/utils';

export const toVersion = 'example';

export const v1AbstractSqlModel = getAbstractSqlModelFromFile(
	__dirname + '/example.sbvr',
);

v1AbstractSqlModel.relationships['version'] = { v1: {} };

export const v1Translations: ConfigLoader.Model['translations'] = {
	organization: {
		'other image': 'logo image',
	},
};

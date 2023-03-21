import { ConfigLoader } from '../../../../../src/server-glue/module';
import { getAbstractSqlModelFromFile } from '../../../../../src/bin/utils';

export const toVersion = 'v2';

export const v1AbstractSqlModel = getAbstractSqlModelFromFile(
	__dirname + '/university.sbvr',
);

v1AbstractSqlModel.relationships['version'] = { v1: {} };

export const v1Translations: ConfigLoader.Model['translations'] = {
	student: {
		lastname: 'last name',
	},
};

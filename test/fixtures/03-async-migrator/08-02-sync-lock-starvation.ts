import type { ConfigLoader } from '../../../src/server-glue/module';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = __dirname + '/example.sbvr';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
			migrations: {
				async: {},
				sync: {
					'1000-another-data-insert': async (tx) => {
						await tx.executeSql(`
					INSERT INTO "device" (
						"id", "name", "note", "type"
					)
					SELECT
						i as "id",
						CONCAT('a','b',trim(to_char(i,'0000000'))) as "name",
						NULL as "note",
						CONCAT('b','b',trim(to_char(i,'0000000'))) as "type"
					FROM generate_series(21, 30) s(i);	
					`);
					},
				},
			},
		},
	],
	users: [
		{
			username: 'guest',
			password: ' ',
			permissions: ['resource.all'],
		},
	],
} as ConfigLoader.Config;

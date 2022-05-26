import type { ConfigLoader } from '../../../src/server-glue/module';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = __dirname + '/example.sbvr';
const migrationsPath = __dirname + '/01-migrations';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
			migrationsPath,
			migrations: {
				'should-never-execute': `
					INSERT INTO "device" (
						"id", "name", "note", "type"
					)
					SELECT
						i as "id",
						CONCAT('a','b',trim(to_char(i,'0000000'))) as "name",
						NULL as "note",
						CONCAT('b','b',trim(to_char(i,'0000000'))) as "type"
					FROM generate_series(1001, 1010) s(i);
				`,
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

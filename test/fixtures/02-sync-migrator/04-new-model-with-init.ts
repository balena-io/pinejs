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
				'0001': `
					INSERT INTO "device" ("id", "name", "note", "type")
					VALUES (2, 'no run', 'shouldNotRun', 'empty')			
				`,
			},
			initSql: `
				INSERT INTO "device" ("id", "name", "note", "type")
				VALUES (1, 'initName', 'shouldBeInit', 'init')			
			`,
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

import type { ConfigLoader } from '@balena/pinejs';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = import.meta.dirname + '/example.sbvr';

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
			migrations: {
				'0001': '<emptyMigration>',
				sync: {
					// @ts-expect-error Intentionally invalid type combo to test failure mode
					'0002': '<emptyMigration>',
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
} satisfies ConfigLoader.Config;

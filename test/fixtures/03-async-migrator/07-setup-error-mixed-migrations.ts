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
				'0001': '<emptyMigration>',
				sync: {
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
} as any;

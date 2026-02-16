import type { ConfigLoader, Migrator } from '@balena/pinejs';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = import.meta.dirname + '/example.sbvr';

const asyncSpammer: Migrator.AsyncMigration = {
	asyncFn: async (tx) => {
		const staticSql = `\
		select pg_sleep(1);
	`;
		return (await tx.executeSql(staticSql)).rowsAffected;
	},
	syncFn: async (tx) => {
		const staticSql = `\
		select pg_sleep(1);
	`;

		await tx.executeSql(staticSql);
	},
	asyncBatchSize: 10,
	delayMS: 50, // aggressive small delays
	backoffDelayMS: 50, // aggressive small delays
	errorThreshold: 15,
	finalize: false,
	type: 'async' as Migrator.MigrationCategories.async,
};

const asyncSpammers: Migrator.RunnableAsyncMigrations = {};

for (let spammerKey = 2; spammerKey < 20; spammerKey++) {
	const key: string = spammerKey.toString().padStart(4, '0') + '-async-spammer';
	asyncSpammers[key] = asyncSpammer;
}

export default {
	models: [
		{
			modelName,
			modelFile,
			apiRoot,
			migrations: {
				sync: {},
				async: asyncSpammers,
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

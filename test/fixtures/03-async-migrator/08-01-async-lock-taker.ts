import type { ConfigLoader } from '../../../src/server-glue/module';

const apiRoot = 'example';
const modelName = 'example';
const modelFile = __dirname + '/example.sbvr';

const asyncSpammer = {
	asyncFn: async (tx: any) => {
		const staticSql = `\
		select pg_sleep(1);
	`;
		return await tx.executeSql(staticSql);
	},
	syncFn: async (tx: any) => {
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
	type: 'async',
};

const asyncSpammers: { [key: string]: {} } = {};

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

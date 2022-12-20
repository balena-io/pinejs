import { AsyncMigration } from '../../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx, options) => {
		options;
		return await tx.executeSql(`SELECT pg_sleep(0.5);`);
	},
	asyncBatchSize: 1,
	syncFn: async (tx) => {
		await tx.executeSql(`SELECT pg_sleep(0.5);`);
	},
	delayMS: 1000,
	backoffDelayMS: 4000,
	errorThreshold: 15,
	finalize: false,
};

export default migration;

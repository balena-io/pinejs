import { AsyncMigration } from '../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx: any) => {
		return await tx.executeSql(`SELECT 1`);
	},
	// @ts-expect-error
	syncFnFalse: {},
	delayMS: 250,
	backoffDelayMS: 1000,
	errorThreshold: 5,
};

export default migration;

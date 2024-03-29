import type { AsyncMigration } from '../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx) => {
		return (await tx.executeSql(`SELECT 1`)).rowsAffected;
	},
	// @ts-expect-error Test passing unknown properties
	syncFnFalse: {},
	delayMS: 250,
	backoffDelayMS: 1000,
	errorThreshold: 5,
};

export default migration;

import { AsyncMigration } from '../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: {} as any,
	syncFnFalse: {} as any,
	delayMS: 250,
	backoffDelayMS: 1000,
	errorThreshold: 5,
};

export default migration;

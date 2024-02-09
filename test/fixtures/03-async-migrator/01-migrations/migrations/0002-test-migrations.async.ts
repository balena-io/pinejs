import type { AsyncMigration } from '../../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx, options) => {
		const staticSql = `\
		UPDATE "device"
		SET "note" = "device"."name"
		WHERE id IN (
			SELECT id FROM "device"
			WHERE  "device"."name" <> "device"."note" OR "device"."note" IS NULL
			LIMIT ${options.batchSize}
		);`;

		return (await tx.executeSql(staticSql)).rowsAffected;
	},
	asyncBatchSize: 1,
	syncFn: async (tx) => {
		const staticSql = `\
		UPDATE "device"
		SET "note" = "device"."name"
		WHERE id IN (
			SELECT id FROM "device"
			WHERE  "device"."name" <> "device"."note" OR "device"."note" IS NULL
		);`;
		await tx.executeSql(staticSql);
	},
	delayMS: 50,
	backoffDelayMS: 1000,
	errorThreshold: 15,
	finalize: false,
};

export default migration;

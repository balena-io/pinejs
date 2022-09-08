import { AsyncMigration } from '../../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx: any, options) => {
		const staticSql = `\
		UPDATE "device"
		SET "note" = "device"."name"
		WHERE id IN (
			SELECT id FROM "device"
			WHERE  "device"."name" <> "device"."note" OR "device"."note" IS NULL
			LIMIT ${options.batchSize}
		);
        `;
		return await tx.executeSql(staticSql);
	},
	syncFn: async (tx: any) => {
		const staticSql = `\
		UPDATE "device"
		SET "note" = "device"."name"
		WHERE id IN (
			SELECT id FROM "device"
			WHERE  "device"."name" <> "device"."note" OR "device"."note" IS NULL
		);
        `;

		await tx.executeSql(staticSql);
	},
	asyncBatchSize: 100000,
	delayMS: 250,
	backoffDelayMS: 4000,
	errorThreshold: 15,
	finalize: false,
};

export default migration;

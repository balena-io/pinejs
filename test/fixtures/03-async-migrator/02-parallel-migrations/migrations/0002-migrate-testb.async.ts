import { AsyncMigration } from '../../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx: any, options) => {
		const staticSql = `\
		UPDATE "deviceb"
		SET "note" = "deviceb"."name"
		WHERE id IN (
			SELECT id FROM "deviceb"
			WHERE  "deviceb"."name" <> "deviceb"."note" OR "deviceb"."note" IS NULL
			LIMIT ${options.batchSize}
		);
        `;

		return await tx.executeSql(staticSql);
	},
	syncFn: async (tx: any) => {
		const staticSql = `\
		UPDATE "deviceb"
		SET "note" = "deviceb"."name"
		WHERE id IN (
			SELECT id FROM "deviceb"
			WHERE  "deviceb"."name" <> "deviceb"."note" OR "deviceb"."note" IS NULL
		);
        `;

		await tx.executeSql(staticSql);
	},
	asyncBatchSize: 1,
	delayMS: 250,
	backoffDelayMS: 4000,
	errorThreshold: 15,
};

export default migration;

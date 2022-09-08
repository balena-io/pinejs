import { AsyncMigration } from '../../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx: any, options) => {
		const staticSql = `\
		UPDATE "device-not-exists"
		SET "note" = "device-not-exists"."name"
		WHERE id IN (
			SELECT id FROM "device-not-exists"
			WHERE  "device-not-exists"."name" <> "device-not-exists"."note" OR "device-not-exists"."note" IS NULL
			LIMIT ${options.batchSize}
		);
        `;

		return await tx.executeSql(staticSql);
	},
	syncFn: async (tx: any) => {
		const staticSql = `\
		UPDATE "device-not-exists"
		SET "note" = "device-not-exists"."name"
		WHERE id IN (
			SELECT id FROM "device-not-exists"
			WHERE  "device-not-exists"."name" <> "device-not-exists"."note" OR "device-not-exists"."note" IS NULL
		);
        `;
		await tx.executeSql(staticSql);
	},
	delayMS: 250,
	backoffDelayMS: 1000,
	errorThreshold: 5,
};
export default migration;

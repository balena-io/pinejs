import type { AsyncMigration } from '../../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncFn: async (tx) => {
		const staticSql = `\
		UPDATE "device"
		SET "note" = "device"."name",
		"id" = 1
		WHERE id IN (
			SELECT id FROM "device"
			WHERE "id" = 2
		);`;

		return (await tx.executeSql(staticSql)).rowsAffected;
	},
	syncFn: async (tx) => {
		const staticSql = `\
		UPDATE "device"
		SET "note" = "device"."name",
		"id" = 1
		WHERE id IN (
			SELECT id FROM "device"
			WHERE "id" = 2
		);`;

		await tx.executeSql(staticSql);
	},
	delayMS: 250,
	backoffDelayMS: 1000,
	errorThreshold: 5,
};
export default migration;

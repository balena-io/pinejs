import { Migrator } from '../../../../src/server-glue/module';

const migration: Migrator.MigrationFn = async (tx) => {
	const staticSql = `\
UPDATE "device"
SET "note" = CONCAT("device"."type",'#migrated')
WHERE id IN (
                    SELECT id FROM "device"
                    WHERE  "device"."note" <> "device"."type" OR "device"."note" IS NULL
            );
        `;
	await tx.executeSql(staticSql);
};

export default migration;

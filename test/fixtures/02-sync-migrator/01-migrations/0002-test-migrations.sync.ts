import { Migrator } from '../../../../src/server-glue/module';

export = (async (tx) => {
	const staticSql = `\
UPDATE "device"
SET "note" = CONCAT("device"."type",'#migrated')
WHERE id IN ( SELECT id FROM (
                    SELECT id FROM "device"
                    WHERE  "device"."note" <> "device"."type" OR "device"."note" IS NULL
                    ) tmp
            );
        `;
	await tx.executeSql(staticSql);
}) as Migrator.MigrationFn;

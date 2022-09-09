import { AsyncMigration } from '../../../../../src/migrator/utils';

const migration: AsyncMigration = {
	asyncSql: `\
        UPDATE "deviceb"
        SET "note" = "deviceb"."name"
        WHERE id IN (  
                SELECT id FROM "deviceb"
                WHERE  "deviceb"."name" <> "deviceb"."note" OR "deviceb"."note" IS NULL
                LIMIT %%ASYNC_BATCH_SIZE%%
        );
        `,
	syncSql: `\
        UPDATE "deviceb"
        SET "note" = "deviceb"."name"
        WHERE id IN (
                SELECT id FROM "deviceb"
                WHERE  "deviceb"."name" <> "deviceb"."note" OR "deviceb"."note" IS NULL
        );
        `,
	delayMS: 100,
	backoffDelayMS: 4000,
	errorThreshold: 15,
	asyncBatchSize: 1,
	finalize: true,
};

export default migration;

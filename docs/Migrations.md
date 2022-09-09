# Migrations

Migrations are SQL queries or Javascript functions which will execute prior to pinejs executing a given SBVR model.

This allows you to make changes to the DB which can't be automatically applied as we execute the SBVR, or to migrate data in the same way across environments, in an automated fashion.

## Specifying migrations

You can specify migrations in a config.json file in one of two ways:

### `migrationsPath`

Set this to point to a directory relative to the config.json file, and pinejs will scan for .sql, .js and .coffee files to execute.

These files should have a filename in the format "KEY-migration-name.ext", which will allow pinejs to sort by the key to run the migrations in order, and determine which migrations have executed and which are pending.

It is recommended to use a timestamp as a key, e.g. "20140918194812", as this will avoid conflicts across branches, and makes it immediately clear when migrations were added.

However, you could use any system, for example "10-first.sql", "20-second.sql" if you prefer.

### `migrations`

You can also specify migrations without using a directory, by providing an object under `migrations` in config.json:

```javascript
{"key1": "sql", "key2": "sql"}
```

This is only useful with config.json in limited cases where only SQL migrations are required, however if you pass configuration to pinejs e.g. through `Pinejs.init`, functions can be used also.

## Execution

When a model executes and there are pending migrations, pinejs will first create a transaction and then run the migrations one at a time inside the transaction.

In the event of an error, the transaction will roll back before bubbling.

You will notice that migrations are executed in the beginning and in case of a successful execution you will see `Successfully executed migrations model` in your standard output.

### SQL

SQL migrations will run with `executeSql` inside the transaction

### Functions (.coffee, .js files)

Migrations which are Node modules should export a function which will be called with `(tx, sbvrUtils)` as arguments.

You can execute SQL using `tx.executeSql(query)`, however note that the model for which the migration is running will *not* be available under `sbvrUtils.api`, as it has not executed yet.

You should return a promise so pinejs can wait for completion/errors.


## Async Migrations

Migrations that may lock tables for a long time, eg. migrating data between columns on large tables, can be run as async migrations.

Async migrations are executed in small batches within individual transactions and run concurrently while Pine is serving requests. Async migrations are multi-instance safe. They are synchronized between instances via the `migration status` database table and the minimum interval between two migration executions is guaranteed across instances.

When Pine starts and determines there are multiple async migrations to be run, it starts all migrations concurrently. These migrations however do not run in parallel: only one migration batch is executed at any given time, then another, and so on. Thus, migrations should not depend on the result a previous one.
Once an async migration starts, it keeps running forever even after Pine instance restarts. The async migration will stop being executed when finalized with a dedicated flag in the async migration definition. This is to guarantee that new data inserted or updated at runtime can also be migrated. The status of running migrations can be checked in `migration status` table. The configured execution parameters and the execution metrics are stored and updated after each migration batch completes. 

Each async migration needs to specify a pair of an async and a sync migration part, so that the sync migration statement closes the async migration and guarantees database consistency.

Async migrations are stored in the migrations folder, alongside synchronous migrations. Their file names are significant and must contain the string `.async.` so they are treated as async migrations. They can only be Typescript / Javascript (with `.ts`/`.js` extensions) files.

The async migration query must have a `LIMIT` statement to limit the maximum number of affected rows per batch.


### Async migration procedure
* Deployment 1
    - Add new column (with independent sync migration) to contain new data and add code accessing the new column.
    - Update the service's implementation to set both the old & new column on each write.
    - The service's implementation should only read the old column since the async migration still migrates data from old column to new column.
    - Async migrator runs forever.
* Deployment 2
    - Finalize async migration => only sync migration part gets executed.
    - Sync migration migrates all left over data from old column to new column.
    - Update the service's implementation to only read the new column, but still write the old one as well.
* Deployment 3
    - Update the service's implementation to stop settings the old column and remove it from the sbvr.
    - Make the old field NULLable if it isn't.
* Deployment 4
    - Delete the old column with a sync migration.
    - 

### TS migration file format with SQL query string

The placeholder `%%ASYNC_BATCH_SIZE%%` will be replaced with the value specified by asyncBatchSize parameter

``` javascript
export = {
	asyncSql: `\
	UPDATE "device"
	SET "note" = "device"."name"
	WHERE id IN (
		SELECT id FROM "device"
		WHERE  "device"."name" <> "device"."note" OR "device"."note" IS NULL
		LIMIT %%ASYNC_BATCH_SIZE%%
	);
	`,
	syncSql: `\
	UPDATE "device"
	SET "note" = "device"."name"
	WHERE  "device"."name" <> "device"."note" OR "device"."note" IS NULL;
	`,
	delayMS: 100,
	backoffDelayMS: 4000,
	errorThreshold: 15,
	asyncBatchSize: 1,
	finalize: true,
};
```

### TS migration file format with migrator function definition

`${options.batchSize}` will be the value specified by asyncBatchSize parameter.

``` javascript
export = {
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
		WHERE  "device"."name" <> "device"."note" OR "device"."note" IS NULL;
        `;

		await tx.executeSql(staticSql);
	},
	asyncBatchSize: 1,
	delayMS: 100,
	backoffDelayMS: 4000,
	errorThreshold: 15,
	finalize: true,
};

```
### SQL query file (plain text)
Plain SQL files are not supported as they cannot bundle async and sync migration statements in one file. Moreover they cannot carry migration metadata.
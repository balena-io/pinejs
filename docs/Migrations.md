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

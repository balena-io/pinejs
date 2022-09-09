import type { Tx } from '../database-layer/db';
import type { Model } from '../config-loader/config-loader';

import * as _ from 'lodash';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';

type ApiRootModel = Model & { apiRoot: string };

type InitialMigrationStatus = MigrationStatus &
	Required<
		Pick<BaseAsyncMigration, 'backoffDelayMS' | 'delayMS' | 'errorThreshold'>
	>;

import {
	MigrationTuple,
	AsyncMigrationFn,
	setExecutedMigrations,
	getExecutedMigrations,
	migratorEnv,
	lockMigrations,
	initMigrationStatus,
	readMigrationStatus,
	updateMigrationStatus,
	RunnableAsyncMigrations,
	getRunnableAsyncMigrations,
	filterAndSortPendingMigrations,
	MigrationStatus,
	BaseAsyncMigration,
} from './utils';

export const run = async (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { migrations } = model;
	if (migrations == null || _.isEmpty(migrations)) {
		return;
	}
	const asyncMigrations: RunnableAsyncMigrations | undefined =
		getRunnableAsyncMigrations(migrations);
	if (asyncMigrations == null) {
		return;
	}

	await $run(tx, model, asyncMigrations);
};

const $run = async (
	setupTx: Tx,
	model: ApiRootModel,
	migrations: RunnableAsyncMigrations,
): Promise<void> => {
	const modelName = model.apiRoot;

	const asyncMigrationSetup: Array<{
		key: string;
		initMigrationState: InitialMigrationStatus;
		asyncRunnerMigratorFn: (tx: Tx) => Promise<number>;
	}> = [];

	// get a transaction for setting up the async migrator
	const modelIsNew = await sbvrUtils.isModelNew(setupTx, modelName);
	const executedMigrations = await getExecutedMigrations(setupTx, modelName);

	if (modelIsNew) {
		(sbvrUtils.api.migrations?.logger.info ?? console.info)(
			'First time model has executed, skipping async migrations',
		);

		return await setExecutedMigrations(setupTx, modelName, [
			...executedMigrations,
			...Object.keys(migrations),
		]);
	}

	/**
	 * preflight check if there are already migrations executed before starting the async scheduler
	 * this will implicitly skip async migrations that have been superseded by synchro migrations.
	 * e.g.:
	 *
	 * sync migrations in repo: 	[001,002,004,005]
	 * async migrations in repo: 	[003,006]
	 *
	 * executed migrations at this point should always contain all sync migrations:
	 * executed migrations: 		[001,002,004,005]
	 *
	 * This will result in only async migration 006 being executed.
	 *
	 * The async migrations are meant to be used in separate deployments to make expensive data migrations
	 * of multiple million row update queries cheaper and with no downtime / long lasting table lock.
	 * In the end, after each async migration, the next deployment should follow up the data migration
	 * with a final sync data migrations.
	 * An async migration will be executed in iterations until no rows are updated anymore (keep row locks short)
	 * then it switches into a backoff mode to check with longer delay if data needs to be migrated in the future.
	 * Example query:
	 * UPDATE tableA
	 * SET columnB = columnA
	 * WHERE id IN (SELECT id
	 * 	           FROM tableA
	 *             WHERE (columnA <> columnB) OR (columnA IS NOT NULL AND columnB IS NULL)
	 *             LIMIT 1000);
	 *
	 * The final sync data migration would look like:
	 * UPDATE tableA
	 * SET columnB = columnA
	 * WHERE (columnA <> columnB) OR (columnA IS NOT NULL AND columnB IS NULL);
	 *
	 * And will update remaining rows, which ideally are 0 and therefore no rows are locked for the update
	 *
	 * In the case of a column rename the columnA could be safely dropped:
	 * ALTER TABLE tableA
	 * DROP COLUMN IF EXISTS columnA;
	 */

	const pendingMigrations: MigrationTuple[] = filterAndSortPendingMigrations(
		migrations,
		executedMigrations,
	);

	// Just schedule the migration workers and don't wait for any return of them
	// the migration workers run until the next deployment and may synchronise with other
	// instances via database tables: migration lock and migration status

	for (const [key, migration] of pendingMigrations) {
		let asyncRunnerMigratorFn: (tx: Tx) => Promise<number>;
		let initMigrationState: InitialMigrationStatus = {
			migration_key: key,
			start_time: new Date(),
			last_run_time: new Date(),
			run_count: 0,
			migrated_row_count: 0,
			error_count: 0,
			errorThreshold: migratorEnv.asyncMigrationDefaultErrorThreshold,
			delayMS: migratorEnv.asyncMigrationDefaultDelayMS,
			backoffDelayMS: migratorEnv.asyncMigrationDefaultBackoffDelayMS,
			converged_time: undefined,
			is_backing_off: false,
		};

		if (typeof migration === 'object') {
			const batchSize =
				migration.asyncBatchSize || migratorEnv.asyncMigrationDefaultBatchSize;
			if (migration.asyncFn && typeof migration.asyncFn === 'function') {
				asyncRunnerMigratorFn = async (tx: Tx) =>
					(
						await (migration.asyncFn as AsyncMigrationFn)(
							tx,
							{
								batchSize,
							},
							sbvrUtils,
						)
					).rowsAffected;
			} else if (migration.asyncSql && typeof migration.asyncSql === 'string') {
				const asyncMigrationSqlStatement = migration.asyncSql?.replace(
					'%%ASYNC_BATCH_SIZE%%',
					`${batchSize}`,
				);
				asyncRunnerMigratorFn = async (tx: Tx) =>
					(await tx.executeSql(asyncMigrationSqlStatement)).rowsAffected;
			} else {
				// don't break the async migration b/c of one migration fails
				(sbvrUtils.api.migrations?.logger.error ?? console.error)(
					`Invalid migration object: ${JSON.stringify(migration, null, 2)}`,
				);
				continue;
			}

			initMigrationState = {
				...initMigrationState,
				..._.pickBy(
					_.pick(migration, ['backoffDelayMS', 'delayMS', 'errorThreshold']),
					(value) => value != null,
				),
			};
		} else if (typeof migration === 'string') {
			asyncRunnerMigratorFn = async (tx: Tx) =>
				(await tx.executeSql(migration)).rowsAffected;
		} else {
			(sbvrUtils.api.migrations?.logger.error ?? console.error)(
				`Invalid async migration object: ${JSON.stringify(migration, null, 2)}`,
			);
			continue;
		}
		await initMigrationStatus(setupTx, initMigrationState);

		asyncMigrationSetup.push({
			key,
			initMigrationState,
			asyncRunnerMigratorFn,
		});
	}

	// Only after the setupTransaction has successfully finalized the asyncMigration runners will be
	// created. When the transaction fails, the setup async migration entries in the DB will be
	// rolled back automatically.
	setupTx.on('end', () => {
		for (const {
			key,
			initMigrationState,
			asyncRunnerMigratorFn,
		} of asyncMigrationSetup) {
			const asyncRunner = async () => {
				await sbvrUtils.db.transaction(async (tx) => {
					await lockMigrations(tx, modelName, async () => {
						const migrationState = await readMigrationStatus(tx, key);

						if (!migrationState) {
							// migration status is unclear stop the migrator
							// or migration should stop
							(sbvrUtils.api.migrations?.logger.info ?? console.info)(
								`stopping async migration: ${key}`,
							);
							return;
						}
						try {
							// sync on the last execution time between instances
							// precondition: All running instances are running on the same time/block
							// skip execution
							if (migrationState.last_run_time) {
								const durationSinceLastRun =
									Date.now() - migrationState.last_run_time.getTime();
								const delayMs = migrationState.is_backing_off
									? initMigrationState.backoffDelayMS
									: initMigrationState.delayMS;
								if (durationSinceLastRun < delayMs) {
									// will still execute finally block where the migration lock is released.
									return;
								}
							}
							// set last run time and run counter only when backoff time sync between
							// competing instances is in sync
							migrationState.last_run_time = new Date();
							migrationState.run_count += 1;

							// here a separate transaction is needed as this migration may fail
							// when it fails it would break the transaction for managing the migration status
							const migratedRows = await sbvrUtils.db.transaction(
								async (migrationTx) => {
									return (await asyncRunnerMigratorFn?.(migrationTx)) ?? 0;
								},
							);

							migrationState.migrated_row_count += migratedRows;
							if (migratedRows === 0) {
								// when all rows have been catched up once we only catch up less frequently
								migrationState.is_backing_off = true;
								// only store the first time when migrator converged to all data migrated
								migrationState.converged_time ??= new Date();
							} else {
								// Only here for the case that after backoff more rows need to be caught up faster
								// If rows have been updated recently we start the interval again with normal frequency
								migrationState.is_backing_off = false;
							}
						} catch (err: unknown) {
							migrationState.error_count++;
							if (err instanceof Error) {
								if (
									migrationState.error_count %
										initMigrationState.errorThreshold ===
									0
								) {
									(sbvrUtils.api.migrations?.logger.error ?? console.error)(
										`${key}: ${err.name} ${err.message}`,
									);
									migrationState.is_backing_off = true;
								}
							} else {
								(sbvrUtils.api.migrations?.logger.error ?? console.error)(
									`async migration error unknown: ${key}: ${err}`,
								);
							}
						} finally {
							if (migrationState.is_backing_off) {
								setTimeout(asyncRunner, initMigrationState.backoffDelayMS);
							} else {
								setTimeout(asyncRunner, initMigrationState.delayMS);
							}
							// using finally as it will also run when return statement is called inside the try block
							// either success or error release the lock
							await updateMigrationStatus(tx, migrationState);
						}
					});
				});
			};

			setTimeout(asyncRunner, initMigrationState.delayMS);
		}
	});
};

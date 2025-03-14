import type { Tx } from '../database-layer/db.js';
import type { Model } from '../config-loader/config-loader.js';

import _ from 'lodash';
import * as sbvrUtils from '../sbvr-api/sbvr-utils.js';

type ApiRootModel = Model & { apiRoot: string };

type InitialMigrationStatus = MigrationStatus &
	Required<
		Pick<BaseAsyncMigration, 'backoffDelayMS' | 'delayMS' | 'errorThreshold'>
	>;

import {
	type MigrationTuple,
	getExecutedMigrations,
	migratorEnv,
	lockMigrations,
	initMigrationStatus,
	readMigrationStatus,
	updateMigrationStatus,
	type RunnableAsyncMigrations,
	getRunnableAsyncMigrations,
	filterAndSortPendingMigrations,
	type MigrationStatus,
	type BaseAsyncMigration,
} from './utils.js';
import { booleanToEnabledString } from '../config-loader/env.js';

export const run = async (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { migrations, apiRoot: apiRootModelName } = model;
	if (migrations == null || _.isEmpty(migrations)) {
		return;
	}
	const asyncMigrations: RunnableAsyncMigrations | undefined =
		getRunnableAsyncMigrations(migrations);
	if (asyncMigrations == null) {
		return;
	}

	// get a transaction for setting up the async migrator
	const executedMigrations = await getExecutedMigrations(tx, apiRootModelName);

	// if the model is new, the sync migration parts (marked by finalize=true) are already marked in the sync migration runner.

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
		asyncMigrations,
		executedMigrations,
	);

	// Pass the minimum and simplest parameters to the async migrator runner,
	// so that everything else (eg: finalized migrations) can be GCed,
	await $run(tx, apiRootModelName, pendingMigrations);
};

const $run = async (
	setupTx: Tx,
	apiRootModelName: string,
	pendingMigrations: MigrationTuple[],
): Promise<void> => {
	const asyncMigrationSetup: Array<{
		key: string;
		initMigrationState: InitialMigrationStatus;
		asyncRunnerMigratorFn: (tx: Tx) => Promise<number>;
	}> = [];

	// Just schedule the migration workers and don't wait for any return of them
	// the migration workers run until the next deployment and may synchronise with other
	// instances via database tables: migration lock and migration status

	for (const [key, migration] of pendingMigrations) {
		let asyncRunnerMigratorFn: (tx: Tx) => Promise<number>;
		let initMigrationState: InitialMigrationStatus = {
			migration_key: key,
			start_time: new Date().toISOString(),
			last_run_time: new Date().toISOString(),
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
				migration.asyncBatchSize ?? migratorEnv.asyncMigrationDefaultBatchSize;
			if (migration.asyncFn && typeof migration.asyncFn === 'function') {
				asyncRunnerMigratorFn = async (tx: Tx) => {
					return await migration.asyncFn(
						tx,
						{
							batchSize,
						},
						sbvrUtils,
					);
				};
			} else if (migration.asyncSql && typeof migration.asyncSql === 'string') {
				const asyncMigrationSqlStatement = migration.asyncSql?.replace(
					'%%ASYNC_BATCH_SIZE%%',
					`${batchSize}`,
				);
				asyncRunnerMigratorFn = async (tx: Tx) =>
					(await tx.executeSql(asyncMigrationSqlStatement)).rowsAffected;
			} else {
				// don't break the async migration b/c of one migration fails
				(sbvrUtils.logger.migrations?.error ?? console.error)(
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
			(sbvrUtils.logger.migrations?.error ?? console.error)(
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
		// log the startup condition of the async migration
		(sbvrUtils.logger?.migrations?.info ?? console.info)(
			`Async migration execution is ${booleanToEnabledString(
				migratorEnv.asyncMigrationIsEnabled,
			)}`,
		);

		for (const {
			key,
			initMigrationState,
			asyncRunnerMigratorFn,
		} of asyncMigrationSetup) {
			const asyncRunner = async () => {
				// don't run the async migration but keep checking
				if (!migratorEnv.asyncMigrationIsEnabled) {
					setTimeout(asyncRunner, initMigrationState.backoffDelayMS);
					return;
				}
				try {
					const $migrationState = await sbvrUtils.db.transaction(
						async (tx) =>
							await lockMigrations(
								{ tx, modelName: apiRootModelName, blocking: false },
								async () => {
									const migrationState = await readMigrationStatus(tx, key);

									if (!migrationState) {
										// migration status is unclear stop the migrator
										// or migration should stop
										(sbvrUtils.logger.migrations?.info ?? console.info)(
											`stopping async migration due to missing migration status: ${key}`,
										);
										return false;
									}
									// sync on the last execution time between instances
									// precondition: All running instances are running on the same time/block
									// skip execution
									if (migrationState.last_run_time) {
										const durationSinceLastRun =
											Date.now() -
											new Date(migrationState.last_run_time).getTime();
										const delayMs = migrationState.is_backing_off
											? initMigrationState.backoffDelayMS
											: initMigrationState.delayMS;
										if (durationSinceLastRun < delayMs) {
											// will still execute finally block where the migration lock is released.
											return;
										}
									}
									try {
										// here a separate transaction is needed as this migration may fail
										// when it fails it would break the transaction for managing the migration status
										const migratedRows = await sbvrUtils.db.transaction(
											async (migrationTx) => {
												// disable automatic close on the management transaction as the migration transaction consumes up to max autoClose time
												// disable first here, to let if fail when it takes to long before coming here to actually migrate.
												tx.disableAutomaticClose();
												const rollbackMigrationTx = async () => {
													// if the parent transaction fails for any reason, the actual running migration transaction has to be rolled back to stop parallel unsafe async migrations.
													try {
														if (!migrationTx.isClosed()) {
															await migrationTx.rollback();
														}
													} catch (err) {
														(
															sbvrUtils.logger.migrations?.error ??
															console.error
														)(
															`error rolling back pending async migration tx on mgmt tx end/rollback: ${key}: ${err}`,
														);
													}
												};
												tx.on('rollback', rollbackMigrationTx);
												tx.on('end', rollbackMigrationTx);
												return (
													(await asyncRunnerMigratorFn?.(migrationTx)) ?? 0
												);
											},
										);
										migrationState.migrated_row_count += migratedRows;
										if (migratedRows === 0) {
											// when all rows have been catched up once we only catch up less frequently
											migrationState.is_backing_off = true;
											// only store the first time when migrator converged to all data migrated
											migrationState.converged_time ??=
												new Date().toISOString();
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
												(sbvrUtils.logger.migrations?.error ?? console.error)(
													`${key}: ${err.name} ${err.message}`,
												);
												migrationState.is_backing_off = true;
											}
										} else {
											(sbvrUtils.logger.migrations?.error ?? console.error)(
												`async migration error unknown: ${key}: ${err}`,
											);
										}
									} finally {
										// using finally as it will also run when return statement is called inside the try block
										// either success or error release the lock
										migrationState.last_run_time = new Date().toISOString();
										migrationState.run_count += 1;
										await updateMigrationStatus(tx, migrationState);
									}
									return migrationState;
								},
							),
					);
					if ($migrationState === false) {
						// We've stopped the migration intentionally
						return;
					}
					if ($migrationState == null || $migrationState.is_backing_off) {
						setTimeout(asyncRunner, initMigrationState.backoffDelayMS);
					} else {
						setTimeout(asyncRunner, initMigrationState.delayMS);
					}
				} catch (err) {
					(sbvrUtils.logger.migrations?.error ?? console.error)(
						`error running async migration: ${key}: ${err}`,
					);
					setTimeout(asyncRunner, initMigrationState.backoffDelayMS);
				}
			};

			setTimeout(asyncRunner, initMigrationState.delayMS);
		}
	});
};

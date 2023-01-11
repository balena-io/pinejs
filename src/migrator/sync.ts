import {
	modelText,
	MigrationTuple,
	MigrationError,
	setExecutedMigrations,
	getExecutedMigrations,
	lockMigrations,
	RunnableMigrations,
	filterAndSortPendingMigrations,
	getRunnableSyncMigrations,
	migrationMetricsEmitter,
	MigrationMetricsEventName,
} from './utils';
import type { Tx } from '../database-layer/db';
import type { Config, Model } from '../config-loader/config-loader';

import * as _ from 'lodash';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';

type ApiRootModel = Model & { apiRoot: string };

export const postRun = async (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { initSql } = model;
	if (initSql == null) {
		return;
	}

	const modelName = model.apiRoot;
	const modelIsNew = await sbvrUtils.isModelNew(tx, modelName);
	if (modelIsNew) {
		(sbvrUtils.api.migrations?.logger.info ?? console.info)(
			`First time executing '${modelName}', running init script`,
		);

		await lockMigrations(tx, modelName, async () => {
			try {
				await tx.executeSql(initSql);
			} catch (err: any) {
				(sbvrUtils.api.migrations?.logger.error ?? console.error)(
					`initSql execution error ${err} `,
				);
				throw new MigrationError(err);
			}
		});
	}
};

export const run = async (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { migrations } = model;
	if (migrations == null || _.isEmpty(migrations)) {
		return;
	}
	const runnableMigrations = getRunnableSyncMigrations(migrations);
	return $run(tx, model, runnableMigrations);
};

const $run = async (
	tx: Tx,
	model: ApiRootModel,
	migrations: RunnableMigrations,
): Promise<void> => {
	const modelName = model.apiRoot;

	// migrations only run if the model has been executed before,
	// to make changes that can't be automatically applied
	const modelIsNew = await sbvrUtils.isModelNew(tx, modelName);
	if (modelIsNew) {
		(sbvrUtils.api.migrations?.logger.info ?? console.info)(
			`First time model '${modelName}' has executed, skipping migrations`,
		);

		return await setExecutedMigrations(tx, modelName, Object.keys(migrations));
	}
	await lockMigrations(tx, modelName, async () => {
		try {
			const executedMigrations = await getExecutedMigrations(tx, modelName);
			const pendingMigrations = filterAndSortPendingMigrations(
				migrations,
				executedMigrations,
			);
			if (pendingMigrations.length === 0) {
				return;
			}

			const newlyExecutedMigrations = await executeMigrations(
				tx,
				pendingMigrations,
			);
			await setExecutedMigrations(tx, modelName, [
				...executedMigrations,
				...newlyExecutedMigrations,
			]);
		} catch (err: any) {
			(sbvrUtils.api.migrations?.logger.error ?? console.error)(
				`Failed to executed synchronous migrations from api root model ${err}`,
			);
			throw new MigrationError(err);
		}
	});
};

const executeMigrations = async (
	tx: Tx,
	migrations: MigrationTuple[] = [],
): Promise<string[]> => {
	try {
		for (const migration of migrations) {
			await executeMigration(tx, migration);
		}
	} catch (err: any) {
		(sbvrUtils.api.migrations?.logger.error ?? console.error)(
			'Error while executing migrations, rolled back',
		);
		throw new MigrationError(err);
	}
	return migrations.map(([migrationKey]) => migrationKey); // return migration keys
};

const executeMigration = async (
	tx: Tx,
	[key, migration]: MigrationTuple,
): Promise<void> => {
	(sbvrUtils.api.migrations?.logger.info ?? console.info)(
		`Running migration ${JSON.stringify(key)}`,
	);

	const migrationStartTimeMs = Date.now();

	if (typeof migration === 'function') {
		await migration(tx, sbvrUtils);
	} else if (typeof migration === 'string') {
		await tx.executeSql(migration);
	} else {
		throw new MigrationError(`Invalid migration type: ${typeof migration}`);
	}

	// follow the same interface for migration_key and last_execution_time_ms as migration status
	migrationMetricsEmitter.emit(
		MigrationMetricsEventName.sync_migration_status,
		{
			migration_key: key,
			last_execution_time_ms: Date.now() - migrationStartTimeMs,
		},
	);
};

export const config: Config = {
	models: [
		{
			modelName: 'migrations',
			apiRoot: 'migrations',
			modelText,
			migrations: {
				'11.0.0-modified-at': `
					ALTER TABLE "migration"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				`,
				'11.0.1-modified-at': `
					ALTER TABLE "migration lock"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				`,
				'14.55.0-last-execution-time': `
					ALTER TABLE "migration status"
					ADD COLUMN IF NOT EXISTS "last execution time ms" INTEGER NULL;
				`,
			},
		},
	],
};

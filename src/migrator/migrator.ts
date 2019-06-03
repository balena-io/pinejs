import * as _ from 'lodash';
import * as Promise from 'bluebird';
import TypedError = require('typed-error');
// tslint:disable-next-line:no-var-requires
const modelText: string = require('./migrations.sbvr');
import { Tx } from '../database-layer/db';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import { migrator as migratorEnv } from '../config-loader/env';
import { Model } from '../config-loader/config-loader';

type ApiRootModel = Model & { apiRoot: string };

type SbvrUtils = typeof sbvrUtils;

type MigrationTuple = [string, Migration];

export type MigrationFn = (
	tx: Tx,
	sbvrUtils: SbvrUtils,
) => Promise<void> | void;

export type Migration = string | MigrationFn;

export class MigrationError extends TypedError {}

export const postRun = (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { initSql } = model;
	if (initSql == null) {
		return Promise.resolve();
	}

	const modelName = model.apiRoot;

	return Promise.using(lockMigrations(tx, modelName), () =>
		checkModelAlreadyExists(tx, modelName).then(exists => {
			if (!exists) {
				sbvrUtils.api.migrations.logger.info(
					'First time executing, running init script',
				);
				return tx.executeSql(initSql).return();
			}
		}),
	);
};

export const run = (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { migrations } = model;
	if (migrations == null || !_.some(migrations)) {
		return Promise.resolve();
	}

	const modelName = model.apiRoot;

	// migrations only run if the model has been executed before,
	// to make changes that can't be automatically applied
	return Promise.using(lockMigrations(tx, modelName), () =>
		checkModelAlreadyExists(tx, modelName).then(exists => {
			if (!exists) {
				sbvrUtils.api.migrations.logger.info(
					'First time model has executed, skipping migrations',
				);

				return setExecutedMigrations(tx, modelName, _.keys(migrations));
			}

			return getExecutedMigrations(tx, modelName).then(executedMigrations => {
				const pendingMigrations = filterAndSortPendingMigrations(
					migrations,
					executedMigrations,
				);
				if (!_.some(pendingMigrations)) {
					return;
				}

				return executeMigrations(tx, pendingMigrations).then(
					newlyExecutedMigrations =>
						setExecutedMigrations(tx, modelName, [
							...executedMigrations,
							...newlyExecutedMigrations,
						]),
				);
			});
		}),
	);
};

export const checkModelAlreadyExists = (
	tx: Tx,
	modelName: string,
): Promise<boolean> =>
	sbvrUtils.api.dev
		.get({
			resource: 'model',
			passthrough: {
				tx,
				req: sbvrUtils.rootRead,
			},
			options: {
				$select: 'is_of__vocabulary',
				$top: 1,
				$filter: {
					is_of__vocabulary: modelName,
				},
			},
		})
		.then(_.some);

export const getExecutedMigrations = (
	tx: Tx,
	modelName: string,
): Promise<string[]> =>
	sbvrUtils.api.migrations
		.get({
			resource: 'migration',
			id: modelName,
			passthrough: {
				tx,
				req: sbvrUtils.rootRead,
			},
			options: {
				$select: 'executed_migrations',
			},
		})
		.then((data: sbvrUtils.AnyObject) => {
			if (data == null) {
				return [];
			}
			return data.executed_migrations as string[];
		});

export const setExecutedMigrations = (
	tx: Tx,
	modelName: string,
	executedMigrations: string[],
): Promise<void> =>
	sbvrUtils.api.migrations
		.put({
			resource: 'migration',
			id: modelName,
			passthrough: {
				tx,
				req: sbvrUtils.root,
			},
			options: { returnResult: false },
			body: {
				model_name: modelName,
				executed_migrations: executedMigrations,
			},
		})
		.return();

// turns {"key1": migration, "key3": migration, "key2": migration}
// into  [["key1", migration], ["key2", migration], ["key3", migration]]
export const filterAndSortPendingMigrations = (
	migrations: NonNullable<Model['migrations']>,
	executedMigrations: string[],
): Array<MigrationTuple> =>
	(_(migrations).omit(executedMigrations) as _.Object<typeof migrations>)
		.toPairs()
		.sortBy(([migrationKey]) => migrationKey)
		.value();

const lockMigrations = (tx: Tx, modelName: string): Promise.Disposer<void> =>
	sbvrUtils.api.migrations
		.delete({
			resource: 'migration_lock',
			id: modelName,
			passthrough: {
				tx,
				req: sbvrUtils.root,
			},
			options: {
				$filter: {
					created_at: {
						$lt: new Date(Date.now() - migratorEnv.lockTimeout),
					},
				},
			},
		})
		.then(() =>
			sbvrUtils.api.migrations.post({
				resource: 'migration_lock',
				passthrough: {
					tx,
					req: sbvrUtils.root,
				},
				options: { returnResult: false },
				body: {
					model_name: modelName,
				},
			}),
		)
		.tapCatch(() => Promise.delay(migratorEnv.lockFailDelay))
		.return()
		.disposer(() => {
			return sbvrUtils.api.migrations
				.delete({
					resource: 'migration_lock',
					id: modelName,
					passthrough: {
						tx,
						req: sbvrUtils.root,
					},
				})
				.return();
		});

export const executeMigrations = (
	tx: Tx,
	migrations: Array<MigrationTuple> = [],
): Promise<string[]> =>
	Promise.mapSeries(migrations, executeMigration.bind(null, tx))
		.catch(err => {
			sbvrUtils.api.migrations.logger.error(
				'Error while executing migrations, rolled back',
			);
			throw new MigrationError(err);
		})
		.return(_.map(migrations, ([migrationKey]) => migrationKey)); // return migration keys

export const executeMigration = (
	tx: Tx,
	[key, migration]: MigrationTuple,
): Promise<void> => {
	sbvrUtils.api.migrations.logger.info(
		`Running migration ${JSON.stringify(key)}`,
	);

	if (_.isFunction(migration)) {
		return Promise.resolve(migration(tx, sbvrUtils));
	}
	if (_.isString(migration)) {
		return tx.executeSql(migration).return();
	}
	throw new MigrationError(`Invalid migration type: ${typeof migration}`);
};

export const config = {
	models: [
		{
			modelName: 'migrations',
			apiRoot: 'migrations',
			modelText: modelText,
		},
	],
};

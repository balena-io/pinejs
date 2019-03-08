import * as _ from 'lodash';
import * as Promise from 'bluebird';
import { TypedError } from 'typed-error';
// tslint:disable-next-line:no-var-requires
const modelText: string = require('./migrations.sbvr');
import { Tx } from '../database-layer/db';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import { migrator as migratorEnv } from '../config-loader/env';
import { Model, Config } from '../config-loader/config-loader';
import { Resolvable } from '../sbvr-api/common-types';
import { Engines } from '@resin/abstract-sql-compiler';

type ApiRootModel = Model & { apiRoot: string };

type SbvrUtils = typeof sbvrUtils;

type MigrationTuple = [string, Migration];

export type MigrationFn = (tx: Tx, sbvrUtils: SbvrUtils) => Resolvable<void>;

export type Migration = string | MigrationFn;

export class MigrationError extends TypedError {}

// Tagged template to convert binds from `?` format to the necessary output format,
// eg `$1`/`$2`/etc for postgres
const binds = (strings: TemplateStringsArray, ...binds: number[]) =>
	strings
		.map((str, i) => {
			if (i === binds.length) {
				return str;
			}
			if (i + 1 !== binds[i]) {
				throw new SyntaxError('Migration sql binds must be sequential');
			}
			if (sbvrUtils.db.engine === Engines.postgres) {
				return str + `$${binds[i]}`;
			}
			return str + `?`;
		})
		.join('');

export const postRun = (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { initSql } = model;
	if (initSql == null) {
		return Promise.resolve();
	}

	const modelName = model.apiRoot;

	return checkModelAlreadyExists(tx, modelName).then(exists => {
		if (!exists) {
			(sbvrUtils.api.migrations?.logger.info ?? console.info)(
				'First time executing, running init script',
			);
			return Promise.using(lockMigrations(tx, modelName), () =>
				tx.executeSql(initSql).return(),
			);
		}
	});
};

export const run = (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { migrations } = model;
	if (migrations == null || !_.some(migrations)) {
		return Promise.resolve();
	}

	const modelName = model.apiRoot;

	// migrations only run if the model has been executed before,
	// to make changes that can't be automatically applied
	return checkModelAlreadyExists(tx, modelName).then(exists => {
		if (!exists) {
			(sbvrUtils.api.migrations?.logger.info ?? console.info)(
				'First time model has executed, skipping migrations',
			);

			return setExecutedMigrations(tx, modelName, _.keys(migrations));
		}
		return Promise.using(lockMigrations(tx, modelName), () =>
			getExecutedMigrations(tx, modelName).then(executedMigrations => {
				const pendingMigrations = filterAndSortPendingMigrations(
					migrations,
					executedMigrations,
				);
				if (!_.some(pendingMigrations)) {
					return;
				}

				return executeMigrations(
					tx,
					pendingMigrations,
				).then(newlyExecutedMigrations =>
					setExecutedMigrations(tx, modelName, [
						...executedMigrations,
						...newlyExecutedMigrations,
					]),
				);
			}),
		);
	});
};

const checkModelAlreadyExists = (tx: Tx, modelName: string): Promise<boolean> =>
	tx
		.executeSql(
			binds`
SELECT 1
FROM "model"
WHERE "model"."is of-vocabulary" = ${1}
LIMIT 1`,
			[modelName],
		)
		.then(({ rows }) => {
			return rows.length > 0;
		});

const getExecutedMigrations = (tx: Tx, modelName: string): Promise<string[]> =>
	tx
		.executeSql(
			binds`
SELECT "migration"."executed migrations" AS "executed_migrations"
FROM "migration"
WHERE "migration"."model name" = ${1}`,
			[modelName],
		)
		.then(({ rows }) => {
			const data = rows[0];
			if (data == null) {
				return [];
			}

			return JSON.parse(data.executed_migrations) as string[];
		});

const setExecutedMigrations = (
	tx: Tx,
	modelName: string,
	executedMigrations: string[],
): Promise<void> => {
	const stringifiedMigrations = JSON.stringify(executedMigrations);

	return tx.tableList("name = 'migration'").then(result => {
		if (result.rows.length === 0) {
			return;
		}
		return tx
			.executeSql(
				binds`
UPDATE "migration"
SET "model name" = ${1},
	"executed migrations" = ${2}
WHERE "migration"."model name" = ${3}`,
				[modelName, stringifiedMigrations, modelName],
			)
			.then(({ rowsAffected }) => {
				if (rowsAffected === 0) {
					tx.executeSql(
						binds`
INSERT INTO "migration" ("model name", "executed migrations")
VALUES (${1}, ${2})`,
						[modelName, stringifiedMigrations],
					);
				}
			})
			.return();
	});
};

// turns {"key1": migration, "key3": migration, "key2": migration}
// into  [["key1", migration], ["key2", migration], ["key3", migration]]
const filterAndSortPendingMigrations = (
	migrations: NonNullable<Model['migrations']>,
	executedMigrations: string[],
): Array<MigrationTuple> =>
	(_(migrations).omit(executedMigrations) as _.Object<typeof migrations>)
		.toPairs()
		.sortBy(([migrationKey]) => migrationKey)
		.value();

const lockMigrations = (tx: Tx, modelName: string): Promise.Disposer<void> =>
	tx
		.executeSql(
			binds`
DELETE FROM "migration lock"
WHERE "model name" = ${1}
AND "created at" < ${2}`,
			[modelName, new Date(Date.now() - migratorEnv.lockTimeout)],
		)
		.then(() =>
			tx.executeSql(
				binds`
INSERT INTO "migration lock" ("model name")
VALUES (${1})`,
				[modelName],
			),
		)
		.tapCatch(() => Promise.delay(migratorEnv.lockFailDelay))
		.return()
		.disposer(() => {
			return tx
				.executeSql(
					binds`
DELETE FROM "migration lock"
WHERE "model name" = ${1}`,
					[modelName],
				)
				.return();
		});

const executeMigrations = (
	tx: Tx,
	migrations: Array<MigrationTuple> = [],
): Promise<string[]> =>
	Promise.mapSeries(migrations, executeMigration.bind(null, tx))
		.catch(err => {
			(sbvrUtils.api.migrations?.logger.error ?? console.error)(
				'Error while executing migrations, rolled back',
			);
			throw new MigrationError(err);
		})
		.return(migrations.map(([migrationKey]) => migrationKey)); // return migration keys

const executeMigration = (
	tx: Tx,
	[key, migration]: MigrationTuple,
): Promise<void> => {
	(sbvrUtils.api.migrations?.logger.info ?? console.info)(
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

export const config: Config = {
	models: [
		{
			modelName: 'migrations',
			apiRoot: 'migrations',
			modelText: modelText,
		},
	],
};

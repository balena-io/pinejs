import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { TypedError } from 'typed-error';
// tslint:disable-next-line:no-var-requires
const modelText: string = require('./migrations.sbvr');
import { Engines } from '@resin/abstract-sql-compiler';
import { Config, Model } from '../config-loader/config-loader';
import { migrator as migratorEnv } from '../config-loader/env';
import { Tx } from '../database-layer/db';
import { Resolvable } from '../sbvr-api/common-types';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';

type ApiRootModel = Model & { apiRoot: string };

type SbvrUtils = typeof sbvrUtils;

type MigrationTuple = [string, Migration];

export type MigrationFn = (tx: Tx, sbvrUtils: SbvrUtils) => Resolvable<void>;

export type Migration = string | MigrationFn;

export class MigrationError extends TypedError {}

// Tagged template to convert binds from `?` format to the necessary output format,
// eg `$1`/`$2`/etc for postgres
const binds = (strings: TemplateStringsArray, ...bindNums: number[]) =>
	strings
		.map((str, i) => {
			if (i === bindNums.length) {
				return str;
			}
			if (i + 1 !== bindNums[i]) {
				throw new SyntaxError('Migration sql binds must be sequential');
			}
			if (sbvrUtils.db.engine === Engines.postgres) {
				return str + `$${bindNums[i]}`;
			}
			return str + `?`;
		})
		.join('');

export const postRun = (tx: Tx, model: ApiRootModel): Bluebird<void> => {
	const { initSql } = model;
	if (initSql == null) {
		return Bluebird.resolve();
	}

	const modelName = model.apiRoot;

	return checkModelAlreadyExists(tx, modelName).then(exists => {
		if (!exists) {
			(sbvrUtils.api.migrations?.logger.info ?? console.info)(
				'First time executing, running init script',
			);
			return Bluebird.using(lockMigrations(tx, modelName), () =>
				tx.executeSql(initSql).return(),
			);
		}
	});
};

export const run = (tx: Tx, model: ApiRootModel): Bluebird<void> => {
	const { migrations } = model;
	if (migrations == null || !_.some(migrations)) {
		return Bluebird.resolve();
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
		return Bluebird.using(lockMigrations(tx, modelName), async () => {
			const executedMigrations = await getExecutedMigrations(tx, modelName);
			const pendingMigrations = filterAndSortPendingMigrations(
				migrations,
				executedMigrations,
			);
			if (!_.some(pendingMigrations)) {
				return;
			}

			const newlyExecutedMigrations = await executeMigrations(
				tx,
				pendingMigrations,
			);
			return setExecutedMigrations(tx, modelName, [
				...executedMigrations,
				...newlyExecutedMigrations,
			]);
		});
	});
};

const checkModelAlreadyExists = (
	tx: Tx,
	modelName: string,
): Bluebird<boolean> =>
	tx.tableList("name = 'migration'").then(result => {
		if (result.rows.length === 0) {
			return false;
		}
		return tx
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
	});

const getExecutedMigrations = async (
	tx: Tx,
	modelName: string,
): Promise<string[]> => {
	const { rows } = await tx.executeSql(
		binds`
SELECT "migration"."executed migrations" AS "executed_migrations"
FROM "migration"
WHERE "migration"."model name" = ${1}`,
		[modelName],
	);

	const data = rows[0];
	if (data == null) {
		return [];
	}

	return JSON.parse(data.executed_migrations) as string[];
};

const setExecutedMigrations = async (
	tx: Tx,
	modelName: string,
	executedMigrations: string[],
): Promise<void> => {
	const stringifiedMigrations = JSON.stringify(executedMigrations);

	const result = await tx.tableList("name = 'migration'");
	if (result.rows.length === 0) {
		return;
	}

	const { rowsAffected } = await tx.executeSql(
		binds`
UPDATE "migration"
SET "model name" = ${1},
"executed migrations" = ${2}
WHERE "migration"."model name" = ${3}`,
		[modelName, stringifiedMigrations, modelName],
	);

	if (rowsAffected === 0) {
		tx.executeSql(
			binds`
INSERT INTO "migration" ("model name", "executed migrations")
VALUES (${1}, ${2})`,
			[modelName, stringifiedMigrations],
		);
	}
};

// turns {"key1": migration, "key3": migration, "key2": migration}
// into  [["key1", migration], ["key2", migration], ["key3", migration]]
const filterAndSortPendingMigrations = (
	migrations: NonNullable<Model['migrations']>,
	executedMigrations: string[],
): MigrationTuple[] =>
	(_(migrations).omit(executedMigrations) as _.Object<typeof migrations>)
		.toPairs()
		.sortBy(([migrationKey]) => migrationKey)
		.value();

const lockMigrations = (tx: Tx, modelName: string): Bluebird.Disposer<void> =>
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
		.tapCatch(() => Bluebird.delay(migratorEnv.lockFailDelay))
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

const executeMigrations = async (
	tx: Tx,
	migrations: MigrationTuple[] = [],
): Promise<string[]> => {
	try {
		for (const migration of migrations) {
			await executeMigration(tx, migration);
		}
	} catch (err) {
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

	if (_.isFunction(migration)) {
		await migration(tx, sbvrUtils);
	} else if (typeof migration === 'string') {
		await tx.executeSql(migration);
	} else {
		throw new MigrationError(`Invalid migration type: ${typeof migration}`);
	}
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
			},
		},
	],
};

import type { Tx } from '../database-layer/db';
import type { Resolvable } from '../sbvr-api/common-types';
import type { Config, Model } from '../config-loader/config-loader';

import { Engines } from '@balena/abstract-sql-compiler';
import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { TypedError } from 'typed-error';
import { migrator as migratorEnv } from '../config-loader/env';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';

// tslint:disable-next-line:no-var-requires
const modelText: string = require('./migrations.sbvr');

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

export const postRun = async (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { initSql } = model;
	if (initSql == null) {
		return;
	}

	const modelName = model.apiRoot;

	const exists = await checkModelAlreadyExists(tx, modelName);
	if (!exists) {
		(sbvrUtils.api.migrations?.logger.info ?? console.info)(
			'First time executing, running init script',
		);
		await Bluebird.using(lockMigrations(tx, modelName), async () => {
			await tx.executeSql(initSql);
		});
	}
};

export const run = async (tx: Tx, model: ApiRootModel): Promise<void> => {
	const { migrations } = model;
	if (migrations == null || _.isEmpty(migrations)) {
		return;
	}

	const modelName = model.apiRoot;

	// migrations only run if the model has been executed before,
	// to make changes that can't be automatically applied
	const exists = await checkModelAlreadyExists(tx, modelName);
	if (!exists) {
		(sbvrUtils.api.migrations?.logger.info ?? console.info)(
			'First time model has executed, skipping migrations',
		);

		return await setExecutedMigrations(tx, modelName, Object.keys(migrations));
	}
	await Bluebird.using(lockMigrations(tx, modelName), async () => {
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
	});
};

const checkModelAlreadyExists = async (
	tx: Tx,
	modelName: string,
): Promise<boolean> => {
	const result = await tx.tableList("name = 'migration'");
	if (result.rows.length === 0) {
		return false;
	}
	const { rows } = await tx.executeSql(
		binds`
SELECT 1
FROM "model"
WHERE "model"."is of-vocabulary" = ${1}
LIMIT 1`,
		[modelName],
	);

	return rows.length > 0;
};

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
		await tx.executeSql(
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
	Bluebird.try(async () => {
		try {
			await tx.executeSql(
				binds`
DELETE FROM "migration lock"
WHERE "model name" = ${1}
AND "created at" < ${2}`,
				[modelName, new Date(Date.now() - migratorEnv.lockTimeout)],
			);
			await tx.executeSql(
				binds`
INSERT INTO "migration lock" ("model name")
VALUES (${1})`,
				[modelName],
			);
		} catch (err) {
			await Bluebird.delay(migratorEnv.lockFailDelay);
			throw err;
		}
	}).disposer(async () => {
		try {
			await tx.executeSql(
				binds`
DELETE FROM "migration lock"
WHERE "model name" = ${1}`,
				[modelName],
			);
		} catch {
			// We ignore errors here as it's mostly likely caused by the migration failing and
			// rolling back the transaction, and if we rethrow here we'll overwrite the real error
			// making it much harder for users to see what went wrong and fix it
		}
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

	if (typeof migration === 'function') {
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

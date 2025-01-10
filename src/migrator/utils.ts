import type { Result, Tx } from '../database-layer/db.js';
import type { Resolvable } from '../sbvr-api/common-types.js';

import { createHash } from 'crypto';
import { Engines } from '@balena/abstract-sql-compiler';
import _ from 'lodash';
import { TypedError } from 'typed-error';
import { migrator as migratorEnv } from '../config-loader/env.js';
export { migrator as migratorEnv } from '../config-loader/env.js';
import { PINEJS_ADVISORY_LOCK } from '../config-loader/env.js';
import { delay } from '../sbvr-api/control-flow.js';

import * as sbvrUtils from '../sbvr-api/sbvr-utils.js';
export enum MigrationCategories {
	'sync' = 'sync',
	'async' = 'async',
}
export const defaultMigrationCategory = MigrationCategories.sync;
export type CategorizedMigrations = {
	[key in MigrationCategories]: RunnableMigrations;
};

type SbvrUtils = typeof sbvrUtils;
export type MigrationTuple = [string, Migration];
export type MigrationFn = (tx: Tx, sbvrUtils: SbvrUtils) => Resolvable<void>;
export type RunnableMigrations = { [key: string]: Migration };
export type RunnableAsyncMigrations = { [key: string]: AsyncMigration };
export type Migrations = CategorizedMigrations | RunnableMigrations;
export type AsyncMigrationFn = (
	tx: Tx,
	options: { batchSize: number },
	sbvrUtils: SbvrUtils,
) => Resolvable<number>;

type AddFn<T extends object, x extends 'sync' | 'async'> = T & {
	[key in `${x}Fn`]: key extends 'syncFn' ? MigrationFn : AsyncMigrationFn;
} & {
	[key in `${x}Sql`]?: undefined;
};
type AddSql<T extends object, x extends 'sync' | 'async'> = T & {
	[key in `${x}Fn`]?: undefined;
} & {
	[key in `${x}Sql`]: string;
};

export type BaseAsyncMigration = {
	type?: MigrationCategories.async;
	delayMS?: number | undefined;
	backoffDelayMS?: number | undefined;
	errorThreshold?: number | undefined;
	asyncBatchSize?: number | undefined;
	finalize?: boolean | undefined;
};
export type AsyncMigration =
	| AddFn<BaseAsyncMigration, 'async' | 'sync'>
	| AddSql<BaseAsyncMigration, 'async' | 'sync'>
	| AddFn<AddSql<BaseAsyncMigration, 'async'>, 'sync'>
	| AddFn<AddSql<BaseAsyncMigration, 'sync'>, 'async'>;

export function isAsyncMigration(
	migration: string | MigrationFn | AsyncMigration | RunnableMigrations,
): migration is AsyncMigration {
	return (
		((typeof (migration as AsyncMigration).asyncFn === 'function' ||
			typeof (migration as AsyncMigration).asyncSql === 'string') &&
			(typeof (migration as AsyncMigration).syncFn === 'function' ||
				typeof (migration as AsyncMigration).syncSql === 'string')) ||
		(migration as AsyncMigration).type === MigrationCategories.async
	);
}

export function isSyncMigration(
	migration: string | MigrationFn | RunnableMigrations | AsyncMigration,
): migration is MigrationFn {
	return typeof migration === 'function' || typeof migration === 'string';
}
export function areCategorizedMigrations(
	$migrations: Migrations,
): $migrations is CategorizedMigrations {
	const containsCategories = Object.keys(MigrationCategories).some(
		(key) => key in $migrations,
	);
	if (
		containsCategories &&
		Object.keys($migrations).some((key) => !(key in MigrationCategories))
	) {
		throw new Error(
			'Mixing categorized and uncategorized migrations is not supported',
		);
	}
	return containsCategories;
}

export type Migration = string | MigrationFn | AsyncMigration;
export class MigrationError extends TypedError {}

export type MigrationStatus = {
	migration_key: string;
	start_time: string | undefined | null;
	last_run_time: string | undefined | null;
	run_count: number;
	migrated_row_count: number;
	error_count: number;
	converged_time: string | undefined | null;
	is_backing_off: boolean | undefined | null;
};

export type MigrationExecutionResult =
	| undefined
	| {
			pendingUnsetMigrations: string[];
	  };

export const getRunnableAsyncMigrations = (
	$migrations: Migrations,
): RunnableAsyncMigrations | undefined => {
	if ($migrations[MigrationCategories.async]) {
		if (
			Object.values($migrations[MigrationCategories.async]).some(
				(migration) => !isAsyncMigration(migration),
			) ||
			typeof $migrations[MigrationCategories.async] !== 'object'
		) {
			throw new Error(
				`All loaded async migrations need to be of type: ${MigrationCategories.async}`,
			);
		}
		return $migrations[MigrationCategories.async] as RunnableAsyncMigrations;
	}
};

// migration loader should either get migrations from model
// or from the filepath
export const getRunnableSyncMigrations = (
	$migrations: Migrations,
): RunnableMigrations => {
	if (areCategorizedMigrations($migrations)) {
		const runnableMigrations: RunnableMigrations = {};
		for (const [category, categoryMigrations] of Object.entries($migrations)) {
			if (category in MigrationCategories) {
				for (const [key, migration] of Object.entries(
					categoryMigrations as Migrations,
				)) {
					if (isAsyncMigration(migration)) {
						if (migration.finalize) {
							runnableMigrations[key] = migration.syncFn ?? migration.syncSql;
						}
					} else if (isSyncMigration(migration)) {
						runnableMigrations[key] = migration;
					}
				}
			}
		}
		return runnableMigrations;
	}
	return $migrations;
};

// turns {"key1": migration, "key3": migration, "key2": migration}
// into  [["key1", migration], ["key2", migration], ["key3", migration]]
export const filterAndSortPendingMigrations = (
	$migrations: NonNullable<RunnableMigrations | RunnableAsyncMigrations>,
	executedMigrations: string[],
): MigrationTuple[] =>
	_($migrations)
		.omit(executedMigrations)
		.toPairs()
		.sortBy(([migrationKey]) => migrationKey)
		.value();

// Tagged template to convert binds from `?` format to the necessary output format,
// eg `$1`/`$2`/etc for postgres
export const binds = (strings: TemplateStringsArray, ...bindNums: number[]) =>
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

/**
 * Lock mechanism that tries to write model name to the migration lock table
 * This creates an index write lock on this row. This lock is never persisted
 * as the lock is hold only in the transaction and is delete at the end of the
 * transaction.
 *
 * Disadvantage is that no blocking-wait queue can be generated on this lock mechanism
 * It's database engine agnostic and works also for webSQL
 */
const $lockMigrations = async <T>(
	tx: Tx,
	modelName: string,
	fn: () => Promise<T>,
): Promise<T | undefined> => {
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
	} catch (err: any) {
		await delay(migratorEnv.lockFailDelay);
		throw err;
	}
	try {
		return await fn();
	} finally {
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
	}
};

export const lockMigrations = async <T>(
	options: { tx: Tx; modelName: string; blocking: boolean },
	fn: () => Promise<T>,
): Promise<T | undefined> => {
	if (!(await migrationTablesExist(options.tx))) {
		return;
	}

	if (sbvrUtils.db.engine === Engines.websql) {
		return $lockMigrations(options.tx, options.modelName, fn);
	} else if (sbvrUtils.db.engine === Engines.mysql) {
		// right now the mysql locks are not testable
		// pinejs generates models that are not executable on mysql databases
		return $lockMigrations(options.tx, options.modelName, fn);
	} else if (sbvrUtils.db.engine === Engines.postgres) {
		// getTxLevelLock expects a 4 byte integer as the lock key.
		// Therefore the model name is hashed and the first 4 bytes are taken as the Integer representation.
		const modelKey: number = createHash('shake128', { outputLength: 4 })
			.update('resin')
			.digest()
			.readInt32BE();
		const lockStatus = await options.tx.getTxLevelLock(
			PINEJS_ADVISORY_LOCK.namespaceKey,
			modelKey,
			options.blocking,
		);

		if (lockStatus) {
			return await fn();
		}
	} else {
		// we report any error here, as no error should happen at all
		throw new Error(`unknown database engine for getting migration locks`);
	}
};

export const setExecutedMigrations = async (
	tx: Tx,
	modelName: string,
	executedMigrations: string[],
): Promise<MigrationExecutionResult> => {
	if (!(await migrationTablesExist(tx))) {
		return { pendingUnsetMigrations: executedMigrations };
	}

	const stringifiedMigrations = await sbvrUtils.sbvrTypes.JSON.validate(
		executedMigrations,
		true,
	);

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

export const getExecutedMigrations = async (
	tx: Tx,
	modelName: string,
): Promise<string[]> => {
	if (!(await migrationTablesExist(tx))) {
		return [];
	}

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

	const executedMigrations = sbvrUtils.sbvrTypes.JSON.fetchProcessing(
		data.executed_migrations,
	);
	if (!Array.isArray(executedMigrations)) {
		throw new Error(
			`"migration"."executed migrations" is expected to be an Array<string>, but the retrieved value was ${typeof executedMigrations}`,
		);
	}
	if (
		!executedMigrations.every(
			(migration): migration is string => typeof migration === 'string',
		)
	) {
		const nonStringMigrationValue = executedMigrations.find(
			(migration) => typeof migration !== 'string',
		);
		throw new Error(
			`"migration"."executed migrations" is expected to be an Array<string>, but the retrieved array included ${typeof nonStringMigrationValue}`,
		);
	}
	return executedMigrations;
};

export const migrationTablesExist = async (tx: Tx) => {
	const tables = ['migration', 'migration lock', 'migration status'];
	const where = tables.map((tableName) => `name = '${tableName}'`).join(' OR ');
	const result = await tx.tableList(where);
	return result.rows.length === tables.length;
};

export const initMigrationStatus = async (
	tx: Tx,
	migrationStatus: MigrationStatus,
): Promise<Result | undefined> => {
	try {
		return await tx.executeSql(
			binds`
INSERT INTO "migration status" ("migration key", "start time", "is backing off", "run count")
SELECT ${1}, ${2}, ${3}, ${4}
WHERE NOT EXISTS (SELECT 1 FROM "migration status" WHERE "migration key" = ${5})
`,
			[
				migrationStatus['migration_key'],
				migrationStatus['start_time'],
				migrationStatus['is_backing_off'],
				migrationStatus['run_count'],
				migrationStatus['migration_key'],
			],
		);
	} catch (err: any) {
		// we report any error here, as no error should happen at all
		throw new Error(`unknown error in init migration status: ${err}`);
	}
};

// Update all fields of migration status for cross-instance sync
export const updateMigrationStatus = async (
	tx: Tx,
	migrationStatus: MigrationStatus,
): Promise<Result | undefined> => {
	try {
		return await tx.executeSql(
			binds`
UPDATE "migration status"
SET
"run count"	= ${1},
"last run time" = ${2},
"migrated row count" = ${3},
"error count" = ${4},
"converged time" = ${5},
"is backing off" = ${6}
WHERE "migration status"."migration key" = ${7};`,
			[
				migrationStatus['run_count'],
				migrationStatus['last_run_time'],
				migrationStatus['migrated_row_count'],
				migrationStatus['error_count'],
				migrationStatus['converged_time'],
				migrationStatus['is_backing_off'],
				migrationStatus['migration_key'],
			],
		);
	} catch (err: any) {
		// we report any error here, as no error should happen at all
		throw new Error(`unknown error in update migration status: ${err}`);
	}
};

export const readMigrationStatus = async (
	tx: Tx,
	migrationKey: string,
): Promise<MigrationStatus | undefined> => {
	try {
		const { rows } = await tx.executeSql(
			binds`
SELECT *
FROM "migration status"
WHERE "migration status"."migration key" = ${1}
LIMIT 1;`,
			[migrationKey],
		);

		const data = rows[0];
		if (data == null) {
			return;
		}

		return {
			migration_key: data['migration key'],
			start_time: sbvrUtils.sbvrTypes['Date Time'].fetchProcessing(
				data['start time'],
			),
			last_run_time: sbvrUtils.sbvrTypes['Date Time'].fetchProcessing(
				data['last run time'],
			),
			run_count: data['run count'],
			migrated_row_count: data['migrated row count'],
			error_count: data['error count'],
			converged_time: sbvrUtils.sbvrTypes['Date Time'].fetchProcessing(
				data['converged time'],
			),
			is_backing_off: sbvrUtils.sbvrTypes.Boolean.fetchProcessing(
				data['is backing off'],
			),
		};
	} catch (err: any) {
		// we report any error here, as no error should happen at all
		throw new Error(`unknown error in read migration status: ${err}`);
	}
};

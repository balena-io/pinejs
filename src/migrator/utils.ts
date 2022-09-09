import type { Result, Tx } from '../database-layer/db';
import type { Resolvable } from '../sbvr-api/common-types';

import { Engines } from '@balena/abstract-sql-compiler';
import * as _ from 'lodash';
import { TypedError } from 'typed-error';
import { migrator as migratorEnv } from '../config-loader/env';
export { migrator as migratorEnv } from '../config-loader/env';
import { delay } from '../sbvr-api/control-flow';

// tslint:disable-next-line:no-var-requires
export const modelText = require('./migrations.sbvr');

import * as sbvrUtils from '../sbvr-api/sbvr-utils';
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
) => Resolvable<Result>;

type AddFn<T extends {}, x extends 'sync' | 'async'> = T & {
	syncFn: MigrationFn;
	asyncFn: AsyncMigrationFn;
} & {
	[key in `${x}Sql`]?: undefined;
};
type AddSql<T extends {}, x extends 'sync' | 'async'> = T & {
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
	migration: AsyncMigration | RunnableMigrations,
): migration is AsyncMigration {
	return (migration as AsyncMigration).type === MigrationCategories.async;
}

export function areCategorizedMigrations(
	migrations: Migrations,
): migrations is CategorizedMigrations {
	const containsCategories = Object.keys(MigrationCategories).some(
		(key) => key in migrations,
	);
	if (
		containsCategories &&
		Object.keys(migrations).some((key) => !(key in MigrationCategories))
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
	start_time: Date;
	last_run_time: Date | null;
	run_count: number;
	migrated_row_count: number;
	error_count: number;
	converged_time: Date | undefined;
	is_backing_off: boolean;
};

export const getRunnableAsyncMigrations = (
	migrations: Migrations,
): RunnableAsyncMigrations | undefined => {
	if (migrations[MigrationCategories.async]) {
		if (
			Object.values(migrations[MigrationCategories.async]).some(
				(migration) => !isAsyncMigration(migration),
			) ||
			typeof migrations[MigrationCategories.async] !== 'object'
		) {
			throw new Error(
				`All loaded async migrations need to be of type: ${MigrationCategories.async}`,
			);
		}
		return migrations[MigrationCategories.async] as RunnableAsyncMigrations;
	}
};

// migration loader should either get migrations from model
// or from the filepath
export const getRunnableSyncMigrations = (
	migrations: Migrations,
): RunnableMigrations => {
	if (areCategorizedMigrations(migrations)) {
		const runnableMigrations: RunnableMigrations = {};
		for (const [category, categoryMigrations] of Object.entries(migrations)) {
			if (category in MigrationCategories) {
				for (const [key, migration] of Object.entries(
					categoryMigrations as Migrations,
				)) {
					if (isAsyncMigration(migration)) {
						if (migration.finalize) {
							runnableMigrations[key] = migration.syncFn ?? migration.syncSql;
						}
					} else {
						runnableMigrations[key] = migration;
					}
				}
			}
		}
		return runnableMigrations;
	}
	return migrations;
};

// turns {"key1": migration, "key3": migration, "key2": migration}
// into  [["key1", migration], ["key2", migration], ["key3", migration]]
export const filterAndSortPendingMigrations = (
	migrations: NonNullable<RunnableMigrations | RunnableAsyncMigrations>,
	executedMigrations: string[],
): MigrationTuple[] =>
	(_(migrations).omit(executedMigrations) as _.Object<typeof migrations>)
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

export const lockMigrations = async <T>(
	tx: Tx,
	modelName: string,
	fn: () => Promise<T>,
): Promise<T | undefined> => {
	if (!(await migrationTablesExist(tx))) {
		return;
	}

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

export const setExecutedMigrations = async (
	tx: Tx,
	modelName: string,
	executedMigrations: string[],
): Promise<void> => {
	const stringifiedMigrations = JSON.stringify(executedMigrations);

	if (!(await migrationTablesExist(tx))) {
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

	return JSON.parse(data.executed_migrations) as string[];
};

export const migrationTablesExist = async (tx: Tx) => {
	const tables = ['migration', 'migration lock'];
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
				migrationStatus['is_backing_off'] ? 1 : 0,
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
				migrationStatus['is_backing_off'] ? 1 : 0,
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
			start_time: data['start time'],
			last_run_time: data['last run time'],
			run_count: data['run count'],
			migrated_row_count: data['migrated row count'],
			error_count: data['error count'],
			converged_time: data['converged time'],
			is_backing_off: data['is backing off'] === 1,
		};
	} catch (err: any) {
		// we report any error here, as no error should happen at all
		throw new Error(`unknown error in read migration status: ${err}`);
	}
};

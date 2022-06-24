import type { Tx } from '../database-layer/db';
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
}
export const defaultMigrationCategory = MigrationCategories.sync;
export type CategorizedMigrations = {
	[key in MigrationCategories]: RunnableMigrations;
};

type SbvrUtils = typeof sbvrUtils;
export type MigrationTuple = [string, Migration];
export type MigrationFn = (tx: Tx, sbvrUtils: SbvrUtils) => Resolvable<void>;
export type Migration = string | MigrationFn;
export type RunnableMigrations = { [key: string]: Migration };
export type Migrations = CategorizedMigrations | RunnableMigrations;

export class MigrationError extends TypedError {}

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
): Promise<T> => {
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

export const getExecutedMigrations = async (
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

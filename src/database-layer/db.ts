/// <references types="websql"/>
import type * as Mysql from 'mysql';
import type * as Pg from 'pg';
import type * as PgConnectionString from 'pg-connection-string';
import type { Resolvable } from '../sbvr-api/common-types';

import { Engines } from '@balena/abstract-sql-compiler';
import * as Bluebird from 'bluebird';
import * as EventEmitter from 'eventemitter3';
import * as _ from 'lodash';
import { TypedError } from 'typed-error';
import * as env from '../config-loader/env';

export const metrics = new EventEmitter();

const { DEBUG } = process.env;

export interface CodedError extends Error {
	code: number | string;
}

type CreateTransactionFn = (stackTraceErr?: Error) => Promise<Tx>;
type CloseTransactionFn = () => void;
export interface Row {
	[fieldName: string]: any;
}
export interface Result {
	rows: Row[];
	rowsAffected: number;
	insertId?: number;
}

export type Sql = string;
export type Bindings = any[];

const isSqlError = (value: any): value is SQLError => {
	return (
		value != null &&
		value.constructor != null &&
		value.constructor.name === 'SQLError'
	);
};

export class DatabaseError extends TypedError {
	public code: number | string;
	constructor(message?: string | CodedError | SQLError) {
		if (isSqlError(message)) {
			// If this is a SQLError we have to handle it specially (since it's not actually an instance of Error)
			super(message.message as string);
		} else {
			super(message);
		}
		if (
			message != null &&
			typeof message !== 'string' &&
			message.code != null
		) {
			// If the message has a code then use that as our code.
			this.code = message.code;
		}
	}
}

export class ConstraintError extends DatabaseError {}
export class UniqueConstraintError extends ConstraintError {}
export class ForeignKeyConstraintError extends ConstraintError {}
export class TransactionClosedError extends ConstraintError {}

const wrapDatabaseError = (err: CodedError) => {
	metrics.emit('db_error', err);
	if (!(err instanceof DatabaseError)) {
		// Wrap the error so we can catch it easier later
		throw new DatabaseError(err);
	}
	throw err;
};

const alwaysExport = {
	DatabaseError,
	ConstraintError,
	UniqueConstraintError,
	ForeignKeyConstraintError,
	TransactionClosedError,
};
type BaseDatabase = typeof alwaysExport;

interface TransactionFn {
	<T>(fn: (tx: Tx) => Resolvable<T>): Promise<T>;
	(): Promise<Tx>;
}

export interface Database extends BaseDatabase {
	engine: Engines;
	executeSql: (
		this: Database,
		sql: Sql,
		bindings?: Bindings,
	) => Promise<Result>;
	transaction: TransactionFn;
	readTransaction?: TransactionFn;
}

export const engines: {
	[engine: string]: (connectString: string | object) => Database;
} = {};

const atomicExecuteSql: Database['executeSql'] = async function (
	sql,
	bindings,
) {
	return await this.transaction(
		async (tx) => await tx.executeSql(sql, bindings),
	);
};

const asyncTryFn = (fn: () => any) => {
	Promise.resolve().then(fn);
};

let timeoutMS: number;
if (process.env.TRANSACTION_TIMEOUT_MS) {
	timeoutMS = parseInt(process.env.TRANSACTION_TIMEOUT_MS, 10);
	if (Number.isNaN(timeoutMS) || timeoutMS <= 0) {
		throw new Error(
			`Invalid valid for TRANSACTION_TIMEOUT_MS: ${process.env.TRANSACTION_TIMEOUT_MS}`,
		);
	}
} else {
	timeoutMS = 10000;
}

type RejectedFunctions = (
	message: string,
) => {
	executeSql: Tx['executeSql'];
	rollback: Tx['rollback'];
};
const getRejectedFunctions: RejectedFunctions = DEBUG
	? (message) => {
			// In debug mode we create the error here to give the stack trace of where we first closed the transaction,
			// but it adds significant overhead for a production environment
			const rejectionValue = new TransactionClosedError(message);
			const rejectFn = async () => {
				// We return a new rejected promise on each call so that errors are automatically logged if the
				// rejection is not handled (but only if it is not handled)
				throw rejectionValue;
			};
			return {
				executeSql: rejectFn,
				rollback: rejectFn,
			};
	  }
	: (message) => {
			const rejectFn = async () => {
				throw new TransactionClosedError(message);
			};
			return {
				executeSql: rejectFn,
				rollback: rejectFn,
			};
	  };

const onEnd: Tx['on'] = (name: string, fn: () => void) => {
	if (name === 'end') {
		asyncTryFn(fn);
	}
};
const onRollback: Tx['on'] = (name: string, fn: () => void) => {
	if (name === 'rollback') {
		asyncTryFn(fn);
	}
};

export abstract class Tx {
	private automaticCloseTimeout: ReturnType<typeof setTimeout>;
	private automaticClose: () => void;
	private closed = false;

	constructor(stackTraceErr?: Error) {
		this.automaticClose = () => {
			console.error(
				'Transaction still open after ' +
					timeoutMS +
					'ms without an execute call.',
			);
			if (stackTraceErr) {
				console.error(stackTraceErr.stack);
			}
			this.rollback();
		};
		this.automaticCloseTimeout = setTimeout(this.automaticClose, timeoutMS);
	}
	private pending: false | number = 0;
	private incrementPending() {
		if (this.pending === false) {
			return;
		}
		this.pending++;
		clearTimeout(this.automaticCloseTimeout);
	}
	private decrementPending() {
		if (this.pending === false) {
			return;
		}
		this.pending--;
		// We only ever want one timeout running at a time, hence not using <=
		if (this.pending === 0) {
			this.automaticCloseTimeout = setTimeout(this.automaticClose, timeoutMS);
		} else if (this.pending < 0) {
			console.error('Pending transactions is less than 0, wtf?');
			this.pending = 0;
		}
	}
	public cancelPending() {
		// Set pending to false to cancel all pending.
		this.pending = false;
		clearTimeout(this.automaticCloseTimeout);
	}

	private closeTransaction(message: string): void {
		this.cancelPending();
		const { executeSql, rollback } = getRejectedFunctions(message);
		this.executeSql = executeSql;
		this.rollback = this.end = rollback;
		this.closed = true;
	}
	public isClosed() {
		return this.closed;
	}

	public async executeSql(
		sql: Sql,
		bindings: Bindings = [],
		...args: any[]
	): Promise<Result> {
		this.incrementPending();

		const t0 = Date.now();
		try {
			return await this._executeSql(sql, bindings, ...args);
		} catch (err) {
			return wrapDatabaseError(err);
		} finally {
			this.decrementPending();
			const queryTime = Date.now() - t0;
			metrics.emit('db_query_time', {
				queryTime,
				// metrics-TODO: statistics on query types (SELECT, INSERT)
				// themselves should be gathered by postgres, while at this
				// scope in pine, we should report the overall query time as
				// being associated with an HTTP method on the given model
				// (eg. [PUT, Device])
				//
				// metrics-TODO: evaluate whether a request to a model can,
				// with hooks, make multiple DB queries in such a way that
				// it would be a statistically significant difference in the
				// "query time" metric if we were to report them individually
				// by attaching here, vs. aggregating all query times for a
				// given request as one figure.
				//
				// Grab the first word of the query and regard that as the
				// "query type" (to be improved in line with the above
				// TODO's)
				queryType: sql.split(' ', 1)[0],
			});
		}
	}
	public async rollback(): Promise<void> {
		try {
			const promise = this._rollback();
			this.closeTransaction('Transaction has been rolled back.');

			await promise;
		} finally {
			this.listeners.rollback.forEach(asyncTryFn);
			this.on = onRollback;
			this.clearListeners();
		}
	}
	public async end(): Promise<void> {
		const promise = this._commit();
		this.closeTransaction('Transaction has been ended.');

		await promise;

		this.listeners.end.forEach(asyncTryFn);
		this.on = onEnd;
		this.clearListeners();
	}

	private listeners: {
		end: Array<() => void>;
		rollback: Array<() => void>;
	} = {
		end: [],
		rollback: [],
	};
	public on(name: keyof Tx['listeners'], fn: () => void): void {
		this.listeners[name].push(fn);
	}

	private clearListeners() {
		this.listeners.end.length = 0;
		this.listeners.rollback.length = 0;
	}

	protected abstract _executeSql(
		sql: Sql,
		bindings: Bindings,
		addReturning?: false | string,
	): Promise<Result>;
	protected abstract _rollback(): Promise<void>;
	protected abstract _commit(): Promise<void>;

	public abstract tableList(extraWhereClause?: string): Promise<Result>;
	public async dropTable(tableName: string, ifExists = true) {
		if (typeof tableName !== 'string') {
			throw new TypeError('"tableName" must be a string');
		}
		if (tableName.includes('"')) {
			throw new TypeError('"tableName" cannot include double quotes');
		}
		const ifExistsStr = ifExists === true ? ' IF EXISTS' : '';
		return await this.executeSql(`DROP TABLE${ifExistsStr} "${tableName}";`);
	}
}

const getStackTraceErr: () => Error | undefined = DEBUG
	? () => new Error()
	: (_.noop as () => undefined);

const createTransaction = (createFunc: CreateTransactionFn): TransactionFn => {
	return async <T>(fn?: (tx: Tx) => Resolvable<T>): Promise<T | Tx> => {
		const stackTraceErr = getStackTraceErr();
		const tx = await createFunc(stackTraceErr);
		if (fn) {
			try {
				const result = await fn(tx);
				await tx.end();
				return result;
			} catch (err) {
				try {
					await tx.rollback();
				} catch {
					// Ignore rollback errors as we want to throw the original error
				}
				throw err;
			}
		} else {
			return tx;
		}
	};
};

let maybePg: typeof Pg | undefined;
try {
	// tslint:disable-next-line:no-var-requires
	maybePg = require('pg');
} catch (e) {
	// Ignore errors
}
if (maybePg != null) {
	const pg = maybePg;
	engines.postgres = (connectString: string | object): Database => {
		const PG_UNIQUE_VIOLATION = '23505';
		const PG_FOREIGN_KEY_VIOLATION = '23503';

		let config: Pg.PoolConfig;
		if (typeof connectString === 'string') {
			const pgConnectionString: typeof PgConnectionString = require('pg-connection-string');
			// We have to cast because of the use of null vs undefined
			config = pgConnectionString.parse(connectString) as Pg.PoolConfig;
		} else {
			config = connectString;
		}
		config.max = env.db.poolSize;
		config.idleTimeoutMillis = env.db.idleTimeoutMillis;
		config.connectionTimeoutMillis = env.db.connectionTimeoutMillis;
		const pool = new pg.Pool(config);
		const { PG_SCHEMA } = process.env;
		if (PG_SCHEMA != null) {
			pool.on('connect', (client) => {
				client.query({ text: `SET search_path TO "${PG_SCHEMA}"` });
			});
			pool.on('error', (err) => {
				console.error('Pool error:', err.message);
			});
		}

		const checkPgErrCode = (err: CodedError) => {
			if (err.code === PG_UNIQUE_VIOLATION) {
				throw new UniqueConstraintError(err);
			}
			if (err.code === PG_FOREIGN_KEY_VIOLATION) {
				throw new ForeignKeyConstraintError(err);
			}
			throw err;
		};

		const createResult = ({
			rowCount,
			rows,
		}: {
			rowCount: number;
			rows: Row[];
		}): Result => {
			return {
				rows,
				rowsAffected: rowCount,
				insertId: rows?.[0]?.id,
			};
		};
		class PostgresTx extends Tx {
			constructor(private db: Pg.PoolClient, stackTraceErr?: Error) {
				super(stackTraceErr);
			}

			protected _executeSql(
				sql: Sql,
				bindings: Bindings,
				addReturning: false | string = false,
			) {
				if (addReturning && /^\s*(?:INSERT\s+INTO|UPDATE|DELETE)/i.test(sql)) {
					sql = sql.replace(/;?$/, ' RETURNING "' + addReturning + '";');
				}

				return this.db
					.query({
						text: sql,
						values: bindings,
					})
					.catch(checkPgErrCode)
					.then(createResult);
			}

			protected async _rollback() {
				try {
					await this.executeSql('ROLLBACK;');
					this.db.release();
				} catch (err) {
					this.db.release(err);
					throw err;
				}
			}

			protected async _commit() {
				try {
					await this.executeSql('COMMIT;');
					this.db.release();
				} catch (err) {
					this.db.release(err);
					throw err;
				}
			}

			public async tableList(extraWhereClause: string = '') {
				if (extraWhereClause !== '') {
					extraWhereClause = 'WHERE ' + extraWhereClause;
				}
				return await this.executeSql(`
					SELECT *
					FROM (
						SELECT tablename as name
						FROM pg_tables
						WHERE schemaname = 'public'
					) t ${extraWhereClause};
				`);
			}
		}
		return {
			engine: Engines.postgres,
			executeSql: atomicExecuteSql,
			transaction: createTransaction((stackTraceErr) =>
				pool.connect().then((client) => {
					const tx = new PostgresTx(client, stackTraceErr);
					tx.executeSql('START TRANSACTION;');
					return tx;
				}),
			),
			readTransaction: createTransaction((stackTraceErr) =>
				pool.connect().then((client) => {
					const tx = new PostgresTx(client, stackTraceErr);
					tx.executeSql('START TRANSACTION;');
					tx.executeSql('SET TRANSACTION READ ONLY;');
					return tx;
				}),
			),
			...alwaysExport,
		};
	};
}

let maybeMysql: typeof Mysql | undefined;
try {
	// tslint:disable-next-line:no-var-requires
	maybeMysql = require('mysql');
} catch (e) {
	// Ignore errors
}
if (maybeMysql != null) {
	const mysql = maybeMysql;
	engines.mysql = (options: Mysql.PoolConfig): Database => {
		const MYSQL_UNIQUE_VIOLATION = 'ER_DUP_ENTRY';
		const MYSQL_FOREIGN_KEY_VIOLATION = 'ER_ROW_IS_REFERENCED';
		const pool = mysql.createPool(options);
		pool.on('connection', (db) => {
			db.query("SET sql_mode='ANSI_QUOTES';");
		});
		const getConnectionAsync = Bluebird.promisify(pool.getConnection, {
			context: pool,
		});

		interface MysqlRowArray extends Array<Row> {
			affectedRows: number;
			insertId?: number;
		}
		const createResult = (rows: MysqlRowArray): Result => {
			return {
				rows,
				rowsAffected: rows.affectedRows,
				insertId: rows.insertId,
			};
		};
		class MySqlTx extends Tx {
			constructor(
				private db: Mysql.Connection,
				private close: CloseTransactionFn,
				stackTraceErr?: Error,
			) {
				super(stackTraceErr);
			}

			protected async _executeSql(sql: Sql, bindings: Bindings) {
				return await Bluebird.fromCallback((callback) => {
					this.db.query(sql, bindings, callback);
				})
					.catch({ code: MYSQL_UNIQUE_VIOLATION }, (err) => {
						// We know that the type is an IError for mysql, but typescript doesn't like the catch obj sugar
						throw new UniqueConstraintError(err as Mysql.MysqlError);
					})
					.catch({ code: MYSQL_FOREIGN_KEY_VIOLATION }, (err) => {
						throw new ForeignKeyConstraintError(err as Mysql.MysqlError);
					})
					.then(createResult);
			}

			protected async _rollback() {
				const promise = this.executeSql('ROLLBACK;');
				this.close();
				await promise;
			}

			protected async _commit() {
				const promise = this.executeSql('COMMIT;');
				this.close();
				await promise;
			}

			public async tableList(extraWhereClause: string = '') {
				if (extraWhereClause !== '') {
					extraWhereClause = ' WHERE ' + extraWhereClause;
				}
				return await this.executeSql(
					`
					SELECT name
					FROM (
						SELECT table_name AS name
						FROM information_schema.tables
						WHERE table_schema = ?
					) t ${extraWhereClause};
				`,
					[options.database],
				);
			}
		}

		return {
			engine: Engines.mysql,
			executeSql: atomicExecuteSql,
			transaction: createTransaction((stackTraceErr) =>
				getConnectionAsync().then((client) => {
					const close = () => client.release();
					const tx = new MySqlTx(client, close, stackTraceErr);
					tx.executeSql('START TRANSACTION;');
					return tx;
				}),
			),
			readTransaction: createTransaction((stackTraceErr) =>
				getConnectionAsync().then((client) => {
					const close = () => client.release();
					const tx = new MySqlTx(client, close, stackTraceErr);
					tx.executeSql('SET TRANSACTION READ ONLY;');
					tx.executeSql('START TRANSACTION;');
					return tx;
				}),
			),
			...alwaysExport,
		};
	};
}

if (typeof window !== 'undefined' && window.openDatabase != null) {
	interface WebSqlResult {
		insertId?: number;
		rowsAffected: number;
		rows: {
			item: (i: number) => Row;
			length: number;
		};
	}
	type AsyncQuery = [
		Sql,
		Bindings,
		SQLStatementCallback,
		SQLStatementErrorCallback,
	];
	engines.websql = (databaseName: string): Database => {
		const WEBSQL_CONSTRAINT_ERR = 6;

		const db = window.openDatabase(
			databaseName,
			'1.0',
			'rulemotion',
			2 * 1024 * 1024,
		);
		const getInsertId = (result: WebSqlResult) => {
			try {
				return result.insertId;
			} catch (e) {
				// Ignore the potential DOM exception.
			}
		};
		const createResult = (result: WebSqlResult): Result => {
			const { length } = result.rows;
			// We convert `result.rows` to a real array to make it easier to work with
			const rows: Row[] = Array(length);
			for (let i = 0; i < length; i++) {
				rows[i] = result.rows.item(i);
			}
			return {
				rows,
				rowsAffected: result.rowsAffected,
				insertId: getInsertId(result),
			};
		};

		class WebSqlTx extends Tx {
			private running = true;
			private queue: AsyncQuery[] = [];
			constructor(private tx: SQLTransaction, stackTraceErr?: Error) {
				super(stackTraceErr);

				this.asyncRecurse();
			}

			// This function is used to recurse executeSql calls and keep the transaction open,
			// allowing us to use async calls within the API.
			private asyncRecurse = () => {
				let args: AsyncQuery | undefined;
				// tslint:disable-next-line no-conditional-assignment
				while ((args = this.queue.pop())) {
					console.debug('Running', args[0]);
					this.tx.executeSql(args[0], args[1], args[2], args[3]);
				}
				if (this.running) {
					console.debug('Looping');
					this.tx.executeSql('SELECT 0', [], this.asyncRecurse);
				}
			};

			protected async _executeSql(sql: Sql, bindings: Bindings) {
				let result;
				try {
					result = await new Promise<SQLResultSet>((resolve, reject) => {
						const successCallback: SQLStatementCallback = (_tx, results) => {
							resolve(results);
						};
						const errorCallback: SQLStatementErrorCallback = (_tx, err) => {
							reject(err);
							return false;
						};

						this.queue.push([sql, bindings, successCallback, errorCallback]);
					});
				} catch (err) {
					if (err.code === WEBSQL_CONSTRAINT_ERR) {
						throw new ConstraintError('Constraint failed.');
					}
					throw err;
				}
				return createResult(result);
			}

			protected async _rollback(): Promise<void> {
				return await new Promise((resolve) => {
					const successCallback: SQLStatementCallback = () => {
						resolve();
						throw new Error('Rollback');
					};
					const errorCallback: SQLStatementErrorCallback = () => {
						resolve();
						return true;
					};
					this.queue = [
						[
							'RUN A FAILING STATEMENT TO ROLLBACK',
							[],
							successCallback,
							errorCallback,
						],
					];
					this.running = false;
				});
			}

			protected async _commit() {
				this.running = false;
			}

			public async tableList(extraWhereClause: string = '') {
				if (extraWhereClause !== '') {
					extraWhereClause = ' AND ' + extraWhereClause;
				}
				return await this.executeSql(`
					SELECT name, sql
					FROM sqlite_master
					WHERE type='table'
					AND name NOT IN (
						'__WebKitDatabaseInfoTable__',
						'sqlite_sequence'
					)
					${extraWhereClause};
				`);
			}
		}

		return {
			engine: Engines.websql,
			executeSql: atomicExecuteSql,
			transaction: createTransaction(
				(stackTraceErr) =>
					new Promise((resolve) => {
						db.transaction((tx) => {
							resolve(new WebSqlTx(tx, stackTraceErr));
						});
					}),
			),
			...alwaysExport,
		};
	};
}

export const connect = (databaseOptions: { engine: string; params: {} }) => {
	if (engines[databaseOptions.engine] == null) {
		throw new Error('Unsupported database engine: ' + databaseOptions.engine);
	}
	return engines[databaseOptions.engine](databaseOptions.params);
};

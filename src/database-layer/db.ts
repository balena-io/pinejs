/// <references types="websql"/>
import * as _events from 'events';
import * as _mysql from 'mysql';
import * as _pg from 'pg';
import * as _pgConnectionString from 'pg-connection-string';
import * as EventEmitter from 'eventemitter3';
import * as _ from 'lodash';
import * as Promise from 'bluebird';
import TypedError = require('typed-error');
import * as env from '../config-loader/env';
import { Engines } from '@resin/abstract-sql-compiler';

export const metrics = new EventEmitter();

const { DEBUG } = process.env;

export interface CodedError extends Error {
	code: number | string;
	constructor: Function;
}

type CreateTransactionFn = (stackTraceErr?: Error) => Promise<Tx>;
type CloseTransactionFn = () => void;
export interface Row {
	[fieldName: string]: any;
}
export interface Result {
	rows: Array<Row>;
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
		if (message != null && !_.isString(message) && message.code != null) {
			// If the message has a code then use that as our code.
			this.code = message.code;
		}
	}
}

export class ConstraintError extends DatabaseError {}
export class UniqueConstraintError extends ConstraintError {}
export class ForeignKeyConstraintError extends ConstraintError {}

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
};

interface TransactionFn {
	<T>(fn: (tx: Tx) => Promise<T> | T): Promise<T>;
	(): Promise<Tx>;
}

export type Database = {
	DatabaseError: typeof DatabaseError;
	ConstraintError: typeof ConstraintError;
	UniqueConstraintError: typeof UniqueConstraintError;
	ForeignKeyConstraintError: typeof ForeignKeyConstraintError;
	engine: Engines;
	executeSql: (
		this: Database,
		sql: Sql,
		bindings?: Bindings,
	) => Promise<Result>;
	transaction: TransactionFn;
};

export const engines: {
	[engine: string]: (connectString: string | object) => Database;
} = {};

const atomicExecuteSql: Database['executeSql'] = function(sql, bindings) {
	return this.transaction(tx => tx.executeSql(sql, bindings));
};

const tryFn = (fn: () => any) => {
	Promise.try(fn);
};

let timeoutMS: number;
if (process.env.TRANSACTION_TIMEOUT_MS) {
	timeoutMS = _.parseInt(process.env.TRANSACTION_TIMEOUT_MS);
	if (_.isNaN(timeoutMS) || timeoutMS <= 0) {
		throw new Error(
			`Invalid valid for TRANSACTION_TIMEOUT_MS: ${
				process.env.TRANSACTION_TIMEOUT_MS
			}`,
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
	? message => {
			// In debug mode we create the error here to give the stack trace of where we first closed the transaction,
			// but it adds significant overhead for a production environment
			const rejectionValue = new Error(message);
			return {
				executeSql: () =>
					// We return a new rejected promise on each call so that bluebird can handle
					// logging errors if the rejection is not handled (but only if it is not handled)
					Promise.reject(rejectionValue),
				rollback: () => Promise.reject(rejectionValue),
			};
	  }
	: message => {
			const rejectFn = () => Promise.reject(new Error(message));
			return {
				executeSql: rejectFn,
				rollback: rejectFn,
			};
	  };

export abstract class Tx {
	private automaticCloseTimeout: ReturnType<typeof setTimeout>;
	private automaticClose: () => void;

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
	cancelPending() {
		// Set pending to false to cancel all pending.
		this.pending = false;
		clearTimeout(this.automaticCloseTimeout);
	}

	private closeTransaction(message: string): void {
		this.cancelPending();
		const { executeSql, rollback } = getRejectedFunctions(message);
		this.executeSql = executeSql;
		this.rollback = this.end = rollback;
	}
	public executeSql(
		sql: Sql,
		bindings: Bindings = [],
		...args: any[]
	): Promise<Result> {
		this.incrementPending();

		let t0 = Date.now();
		return this._executeSql(sql, bindings, ...args)
			.finally(() => {
				this.decrementPending();
				const queryTime = Date.now() - t0;
				metrics.emit('db_query_time', {
					queryTime: queryTime,
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
					queryType: sql.substr(0, sql.indexOf(' ')),
				});
			})
			.catch(wrapDatabaseError);
	}
	public rollback(): Promise<void> {
		const promise = this._rollback().finally(() => {
			this.listeners.rollback.forEach(tryFn);
			return null;
		});
		this.closeTransaction('Transaction has been rolled back.');

		return promise;
	}
	public end(): Promise<void> {
		const promise = this._commit().tap(() => {
			this.listeners.end.forEach(tryFn);
			return null;
		});
		this.closeTransaction('Transaction has been ended.');

		return promise;
	}

	private listeners: {
		end: Array<() => void>;
		rollback: Array<() => void>;
	} = {
		end: [],
		rollback: [],
	};
	public on(name: 'end', fn: () => void): void;
	public on(name: 'rollback', fn: () => void): void;
	public on(name: keyof Tx['listeners'], fn: () => void): void {
		this.listeners[name].push(fn);
	}

	protected abstract _executeSql(
		sql: Sql,
		bindings: Bindings,
		addReturning?: false | string,
	): Promise<Result>;
	protected abstract _rollback(): Promise<void>;
	protected abstract _commit(): Promise<void>;

	public abstract tableList(extraWhereClause?: string): Promise<Result>;
	public dropTable(tableName: string, ifExists = true) {
		if (!_.isString(tableName)) {
			return Promise.reject(new TypeError('"tableName" must be a string'));
		}
		if (_.includes(tableName, '"')) {
			return Promise.reject(
				new TypeError('"tableName" cannot include double quotes'),
			);
		}
		const ifExistsStr = ifExists === true ? ' IF EXISTS' : '';
		return this.executeSql(`DROP TABLE${ifExistsStr} "${tableName}";`);
	}
}

const getStackTraceErr: () => Error | undefined = DEBUG
	? () => new Error()
	: (_.noop as () => undefined);

const createTransaction = (createFunc: CreateTransactionFn): TransactionFn => {
	return <T>(fn?: (tx: Tx) => Promise<T> | T): Promise<T> | Promise<Tx> => {
		const stackTraceErr = getStackTraceErr();
		// Create a new promise in order to be able to get access to cancellation, to let us
		// return the client to the pool if the promise was cancelled whilst we were waiting
		return new Promise<Tx | T>((resolve, reject, onCancel) => {
			if (onCancel) {
				onCancel(() => {
					// Rollback the promise on cancel
					promise.call('rollback');
				});
			}
			const promise = createFunc(stackTraceErr);
			if (fn) {
				promise
					.tap(tx =>
						Promise.try<T>(() => fn(tx))
							.tap(() => tx.end())
							.tapCatch(() => tx.rollback())
							.then(resolve),
					)
					.catch(reject);
			} else {
				promise.then(resolve).catch(reject);
			}
		}) as Promise<Tx> | Promise<T>;
	};
};

let maybePg: typeof _pg | undefined;
try {
	// tslint:disable-next-line:no-var-requires
	maybePg = require('pg');
} catch (e) {}
if (maybePg != null) {
	// We have these custom pg types because we pass bluebird as the promise provider
	// so the returned promises are bluebird promises and we rely on that
	interface BluebirdPoolClient extends _events.EventEmitter {
		query(queryConfig: _pg.QueryConfig): Promise<_pg.QueryResult>;
		query(
			queryTextOrConfig: _pg.QueryConfig,
			values?: any[],
		): Promise<_pg.QueryResult>;
		release(err?: Error): void;
	}
	interface BluebirdPool extends _events.EventEmitter {
		connect(): Promise<BluebirdPoolClient>;

		on(
			event: 'error',
			listener: (err: Error, client: BluebirdPoolClient) => void,
		): this;
		on(
			event: 'connect' | 'acquire' | 'remove',
			listener: (client: BluebirdPoolClient) => void,
		): this;
	}

	const pg = maybePg;
	engines.postgres = (connectString: string | object): Database => {
		const PG_UNIQUE_VIOLATION = '23505';
		const PG_FOREIGN_KEY_VIOLATION = '23503';

		let config: _pg.PoolConfig;
		if (_.isString(connectString)) {
			const pgConnectionString: typeof _pgConnectionString = require('pg-connection-string');
			// We have to cast because of the use of null vs undefined
			config = pgConnectionString.parse(connectString) as _pg.PoolConfig;
		} else {
			config = connectString;
		}
		// Use bluebird for our pool promises
		config.Promise = Promise;
		config.max = env.db.poolSize;
		config.idleTimeoutMillis = env.db.idleTimeoutMillis;
		config.connectionTimeoutMillis = env.db.connectionTimeoutMillis;
		const pool = (new pg.Pool(config) as any) as BluebirdPool;
		const { PG_SCHEMA } = process.env;
		if (PG_SCHEMA != null) {
			pool.on('connect', client => {
				client.query({ text: `SET search_path TO "${PG_SCHEMA}"` });
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
			rows: Array<Row>;
		}): Result => {
			return {
				rows,
				rowsAffected: rowCount,
				insertId: _.get(rows, [0, 'id']),
			};
		};
		class PostgresTx extends Tx {
			constructor(private db: BluebirdPoolClient, stackTraceErr?: Error) {
				super(stackTraceErr);
			}

			protected _executeSql(
				sql: Sql,
				bindings: Bindings,
				addReturning: false | string = false,
			) {
				if (addReturning && /^\s*INSERT\s+INTO/i.test(sql)) {
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

			protected _rollback() {
				return this.executeSql('ROLLBACK;')
					.then(() => {
						this.db.release();
					})
					.tapCatch(err => {
						this.db.release(err);
					});
			}

			protected _commit() {
				return this.executeSql('COMMIT;')
					.then(() => {
						this.db.release();
					})
					.tapCatch(err => {
						this.db.release(err);
					});
			}

			public tableList(extraWhereClause: string = '') {
				if (extraWhereClause !== '') {
					extraWhereClause = 'WHERE ' + extraWhereClause;
				}
				return this.executeSql(`
					SELECT *
					FROM (
						SELECT tablename as name
						FROM pg_tables
						WHERE schemaname = 'public'
					) t ${extraWhereClause};
				`);
			}
		}
		return _.extend(
			{
				engine: Engines.postgres,
				executeSql: atomicExecuteSql,
				transaction: createTransaction(stackTraceErr =>
					pool.connect().then(client => {
						const tx = new PostgresTx(client, stackTraceErr);
						tx.executeSql('START TRANSACTION;');
						return tx;
					}),
				),
			},
			alwaysExport,
		);
	};
}

let maybeMysql: typeof _mysql | undefined;
try {
	// tslint:disable-next-line:no-var-requires
	maybeMysql = require('mysql');
} catch (e) {}
if (maybeMysql != null) {
	const mysql = maybeMysql;
	engines.mysql = (options: _mysql.IPoolConfig): Database => {
		const MYSQL_UNIQUE_VIOLATION = 'ER_DUP_ENTRY';
		const MYSQL_FOREIGN_KEY_VIOLATION = 'ER_ROW_IS_REFERENCED';
		const pool = mysql.createPool(options);
		pool.on('connection', db => {
			db.query("SET sql_mode='ANSI_QUOTES';");
		});
		const connect = Promise.promisify(pool.getConnection, { context: pool });

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
				private db: _mysql.IConnection,
				private close: CloseTransactionFn,
				stackTraceErr?: Error,
			) {
				super(stackTraceErr);
			}

			protected _executeSql(sql: Sql, bindings: Bindings) {
				return Promise.fromCallback(callback => {
					this.db.query(sql, bindings, callback);
				})
					.catch({ code: MYSQL_UNIQUE_VIOLATION }, err => {
						// We know that the type is an IError for mysql, but typescript doesn't like the catch obj sugar
						throw new UniqueConstraintError(err as _mysql.IError);
					})
					.catch({ code: MYSQL_FOREIGN_KEY_VIOLATION }, err => {
						throw new ForeignKeyConstraintError(err as _mysql.IError);
					})
					.then(createResult);
			}

			protected _rollback() {
				const promise = this.executeSql('ROLLBACK;');
				this.close();
				return promise.return();
			}

			protected _commit() {
				const promise = this.executeSql('COMMIT;');
				this.close();
				return promise.return();
			}

			public tableList(extraWhereClause: string = '') {
				if (extraWhereClause !== '') {
					extraWhereClause = ' WHERE ' + extraWhereClause;
				}
				return this.executeSql(
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

		return _.extend(
			{
				engine: Engines.mysql,
				executeSql: atomicExecuteSql,
				transaction: createTransaction(stackTraceErr =>
					connect().then(client => {
						const close = () => client.release();
						const tx = new MySqlTx(client, close, stackTraceErr);
						tx.executeSql('START TRANSACTION;');
						return tx;
					}),
				),
			},
			alwaysExport,
		);
	};
}

if (typeof window !== 'undefined' && window.openDatabase != null) {
	interface WebSqlResult {
		insertId?: number;
		rowsAffected: number;
		rows: {
			item: (i: number) => {};
			length: number;
		};
	}
	type AsyncQuery = [
		Sql,
		Bindings,
		SQLStatementCallback,
		SQLStatementErrorCallback
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
			// Ignore the potential DOM exception.
			try {
				return result.insertId;
			} catch (e) {}
		};
		const createResult = (result: WebSqlResult): Result => {
			const rows = _.times(result.rows.length, i => {
				return result.rows.item(i);
			});
			return {
				rows: rows,
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
				while ((args = this.queue.pop())) {
					console.debug('Running', args[0]);
					this.tx.executeSql(args[0], args[1], args[2], args[3]);
				}
				if (this.running) {
					console.debug('Looping');
					this.tx.executeSql('SELECT 0', [], this.asyncRecurse);
				}
			};

			protected _executeSql(sql: Sql, bindings: Bindings) {
				return new Promise((resolve, reject) => {
					const successCallback: SQLStatementCallback = (_tx, results) => {
						resolve(results);
					};
					const errorCallback: SQLStatementErrorCallback = (_tx, err) => {
						reject(err);
						return false;
					};

					this.queue.push([sql, bindings, successCallback, errorCallback]);
				})
					.catch({ code: WEBSQL_CONSTRAINT_ERR }, () => {
						throw new ConstraintError('Constraint failed.');
					})
					.then(createResult);
			}

			protected _rollback(): Promise<void> {
				return new Promise(resolve => {
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

			protected _commit() {
				this.running = false;
				return Promise.resolve();
			}

			public tableList(extraWhereClause: string = '') {
				if (extraWhereClause !== '') {
					extraWhereClause = ' AND ' + extraWhereClause;
				}
				return this.executeSql(`
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

		return _.extend(
			{
				engine: Engines.websql,
				executeSql: atomicExecuteSql,
				transaction: createTransaction(
					stackTraceErr =>
						new Promise(resolve => {
							db.transaction(tx => {
								resolve(new WebSqlTx(tx, stackTraceErr));
							});
						}),
				),
			},
			alwaysExport,
		);
	};
}

export const connect = (databaseOptions: { engine: string; params: {} }) => {
	if (engines[databaseOptions.engine] == null) {
		throw new Error('Unsupported database engine: ' + databaseOptions.engine);
	}
	return engines[databaseOptions.engine](databaseOptions.params);
};

/// <references types="websql"/>
import * as _mysql from 'mysql'
import * as _pg from 'pg'

import * as _ from 'lodash'
import * as Promise from 'bluebird'
import sqlBinds = require('./sql-binds')
import TypedError = require('typed-error')

const { DEBUG } = process.env

interface CodedError extends Error {
	code: number | string
	constructor: Function
}

type CreateTransactionFn = (stackTraceErr?: Error) => Promise<Tx>
type CloseTransactionFn = () => void
interface Row {
	[fieldName: string]: any
}
interface Result {
	rows: {
		length: number
		item: (i: number) => Row
		forEach: (fn: (value: Row, index: number) => void, thisArg?: any) => void
		map: <T>(iterator: (value: Row, index: number) => T, thisArg?: any) => T[]
	}
	rowsAffected: number
	insertId?: number
}

type Callback<T> = (err: Error, result: T) => void
type Sql = string
type Bindings = any[]
type InternalExecuteSql = (sql: Sql, bindings: Bindings, addReturning?: false | string) => Promise<Result>
type InternalRollback = () => Promise<void>
type InternalCommit = () => Promise<void>

const isSqlError = (value: any): value is SQLError => {
	return value != null && value.constructor != null && value.constructor.name === 'SQLError'
}

class DatabaseError extends TypedError {
	public code: number | string
	constructor(message?: string | CodedError | SQLError) {
		if (isSqlError(message)) {
			// If this is a SQLError we have to handle it specially (since it's not actually an instance of Error)
			super(message.message as string)
		} else {
			super(message)
		}
		if (message != null && !_.isString(message) && message.code != null) {
			// If the message has a code then use that as our code.
			this.code = message.code
		}
	}
}

class ConstraintError extends DatabaseError {}
class UniqueConstraintError extends ConstraintError {}
class ForeignKeyConstraintError extends ConstraintError {}

const NotADatabaseError = (err: any) => !(err instanceof DatabaseError)

const DEFAULT_VALUE = {}
const bindDefaultValues = (sql: Sql, bindings: Bindings) => {
	if (!_.some(bindings, (binding) => binding === DEFAULT_VALUE)) {
		// We don't have to do any work if none of the bindings match DEFAULT_VALUE
		return sql
	}
	let bindNo = 0
	return sqlBinds(sql, () => {
		if (bindings[bindNo] === DEFAULT_VALUE) {
			bindings.splice(bindNo, 1)
			return 'DEFAULT'
		} else {
			bindNo++
			return '?'
		}
	})
}

const alwaysExport = {
	DEFAULT_VALUE,
	DatabaseError,
	ConstraintError,
	UniqueConstraintError,
	ForeignKeyConstraintError,
}
export type Database = typeof alwaysExport & {
	engine: string
	executeSql: typeof atomicExecuteSql
	transaction: (callback?: ((tx: Tx) => void)) => Promise<Tx>
}

export const engines: {
	[engine: string]: (connectString: string | object) => Database
} = {}

const atomicExecuteSql = function(this: Database, sql: Sql, bindings?: Bindings, callback?: Callback<Result>) {
	return this.transaction()
	.then((tx) => {
		const result = tx.executeSql(sql, bindings)
		// Use finally so that we do not modify the return of the result and
		// to still trigger bluebird's possibly unhandled exception when relevant.
		return result.finally(() => {
			// It is ok to use synchronous inspection of the promise here since
			// this block will only be run once the promise is resolved.
			if (result.isRejected()) {
				return tx.rollback()
			} else {
				return tx.end()
			}
		})
	}).nodeify(callback)
}

let timeoutMS: number
if (process.env.TRANSACTION_TIMEOUT_MS) {
	timeoutMS = _.parseInt(process.env.TRANSACTION_TIMEOUT_MS)
	if (_.isNaN(timeoutMS) || timeoutMS <= 0) {
		throw new Error(`Invalid valid for TRANSACTION_TIMEOUT_MS: ${process.env.TRANSACTION_TIMEOUT_MS}`)
	}
} else {
	timeoutMS = 10000
}

type RejectedFunctions = (message: string) => {
	executeSql: Tx['executeSql'],
	rollback: Tx['rollback'],
}
const getRejectedFunctions: RejectedFunctions = DEBUG ? (message) => {
	// In debug mode we create the error here to give the stack trace of where we first closed the transaction,
	// but it adds significant overhead for a production environment
	const rejectionValue = new Error(message)
	return {
		executeSql: (_sql, _bindings, callback) =>
			// We return a new rejected promise on each call so that bluebird can handle
			// logging errors if the rejection is not handled (but only if it is not handled)
			Promise.reject(rejectionValue).nodeify(callback),
		rollback: (callback) =>
			Promise.reject(rejectionValue).nodeify(callback),
	}
} : (message) => {
	return {
		executeSql: (_sql, _bindings, callback) =>
			Promise.reject(new Error(message)).nodeify(callback),
		rollback: (callback) =>
			Promise.reject(new Error(message)).nodeify(callback),
	}
}


export abstract class Tx {
	public executeSql: (sql: Sql, bindings?: Bindings, callback?: Callback<Result>, ...args: any[]) => Promise<Result>
	public rollback: (callback?: Callback<void>) => Promise<void>
	public end: (callback?: Callback<void>) => Promise<void>

	constructor(executeSql: InternalExecuteSql, rollback: InternalRollback, commit: InternalCommit, stackTraceErr?: Error) {
		const automaticClose = () => {
			console.error('Transaction still open after ' + timeoutMS + 'ms without an execute call.')
			if (stackTraceErr) {
				console.error(stackTraceErr.stack)
			}
			this.rollback()
		}
		let automaticCloseTimeout = setTimeout(automaticClose, timeoutMS)
		let pending: false | number = 0
		const pendingExecutes = {
			increment: () => {
				if (pending === false) {
					return
				}
				pending++
				clearTimeout(automaticCloseTimeout)
			},
			decrement: () => {
				if (pending === false) {
					return
				}
				pending--
				// We only ever want one timeout running at a time, hence not using <=
				if (pending === 0) {
					automaticCloseTimeout = setTimeout(automaticClose, timeoutMS)
				} else if (pending < 0) {
					console.error('Pending transactions is less than 0, wtf?')
					pending = 0
				}
			},
			cancel: () => {
				// Set pending to false to cancel all pending.
				pending = false
				clearTimeout(automaticCloseTimeout)
			},
		}

		this.executeSql = (sql, bindings = [], callback, ...args) => {
			pendingExecutes.increment()

			sql = bindDefaultValues(sql, bindings)

			return executeSql(sql, bindings, ...args)
				.finally(pendingExecutes.decrement)
				.catch(NotADatabaseError, (err: CodedError) => {
					// Wrap the error so we can catch it easier later
					throw new DatabaseError(err)
				}).nodeify(callback)
		}

		this.rollback = (callback) => {
			const promise = rollback()
			closeTransaction('Transaction has been rolled back.')

			return promise.nodeify(callback)
		}

		this.end = (callback) => {
			const promise = commit()
			closeTransaction('Transaction has been ended.')

			return promise.nodeify(callback)
		}

		const closeTransaction = (message: string) => {
			pendingExecutes.cancel()
			const { executeSql, rollback } = getRejectedFunctions(message)
			this.executeSql = executeSql
			this.rollback = this.end = rollback
		}
	}

	public abstract tableList(extraWhereClause?: string | Callback<Result>, callback?: Callback<Result>): Promise<Result>
	public dropTable(tableName: string, ifExists = true, callback?: Callback<Result>) {
		if (!_.isString(tableName)) {
			return Promise.reject(new TypeError('"tableName" must be a string'))
		}
		if (_.includes(tableName, '"')) {
			return Promise.reject(new TypeError('"tableName" cannot include double quotes'))
		}
		const ifExistsStr = (ifExists === true) ? ' IF EXISTS' : ''
		return this.executeSql(`DROP TABLE${ifExistsStr} "${tableName}";`, [], callback)
	}
}

const getStackTraceErr: (() => Error | undefined) = DEBUG ? () => new Error() : (_.noop as () => undefined)

const createTransaction = (createFunc: CreateTransactionFn) => {
	return (callback?: (tx: Tx) => void) => {
		const stackTraceErr = getStackTraceErr()
		return createFunc(stackTraceErr)
			.tapCatch((err) => {
				console.error('Error connecting', err, err.stack)
			}).asCallback(callback)
	}
}

let maybePg: typeof _pg | undefined
try {
	maybePg = require('pg')
} catch (e) {}
if (maybePg != null) {
	const pg = maybePg
	const ConnectionParameters = require('pg/lib/connection-parameters')
	engines.postgres = (connectString: string | object): Database => {
		const PG_UNIQUE_VIOLATION = '23505'
		const PG_FOREIGN_KEY_VIOLATION = '23503'

		const config: _pg.PoolConfig = new ConnectionParameters(connectString)
		// Use bluebird for our pool promises
		config.Promise = Promise
		// Inherit the same defaults we used to, for backwards compatibility
		config.max = pg.defaults.poolSize
		config.idleTimeoutMillis = pg.defaults.poolIdleTimeout
		config.log = pg.defaults.poolLog
		const pool = new pg.Pool(config)
		const { PG_SCHEMA } = process.env
		if (PG_SCHEMA != null ) {
			pool.on('connect', (client) => {
				client.query({ text: `SET search_path TO "${PG_SCHEMA}"` })
			})
		}
		const connect = Promise.promisify(pool.connect, { context: pool })

		const createResult = ({ rowCount, rows }: { rowCount: number, rows: Array<{id?: number}> }): Result => {
			return {
				rows: {
					length: _.get(rows, 'length', 0),
					item: (i) => rows[i],
					forEach: (iterator, thisArg) => {
						rows.forEach(iterator, thisArg)
					},
					map: (iterator, thisArg) => rows.map(iterator, thisArg),
				},
				rowsAffected: rowCount,
				insertId: _.get(rows, [ 0, 'id' ]),
			}
		}
		class PostgresTx extends Tx {
			constructor(db: _pg.Client, close: CloseTransactionFn, stackTraceErr?: Error) {
				const executeSql: InternalExecuteSql = (sql, bindings, addReturning = false) => {
					bindings = bindings.slice(0) // Deal with the fact we may splice arrays directly into bindings
					if (addReturning && /^\s*INSERT\s+INTO/i.test(sql)) {
						sql = sql.replace(/;?$/, ' RETURNING "' + addReturning + '";')
					}

					// We only need to perform the bind replacements if there is at least one binding!
					if (_.includes(sql, '?')) {
						let bindNo = 0
						sql = sqlBinds(sql, () => {
							if (Array.isArray(bindings[bindNo])) {
								const initialBindNo = bindNo
								const bindString = _.map(bindings[initialBindNo], () => '$' + ++bindNo).join(',')
								Array.prototype.splice.apply(bindings, [initialBindNo, 1].concat(bindings[initialBindNo]))
								return bindString
							} else if (bindings[bindNo] === DEFAULT_VALUE) {
								bindings.splice(bindNo, 1)
								return 'DEFAULT'
							} else {
								return '$' + ++bindNo
							}
						})
					}

					return Promise.fromCallback((callback) => {
						db.query({ text: sql, values: bindings }, callback)
					}).catch({ code: PG_UNIQUE_VIOLATION }, (err) => {
						// We know that the type is an Error for pg, but typescript doesn't like the catch obj sugar
						throw new UniqueConstraintError(err as any as CodedError)
					}).catch({ code: PG_FOREIGN_KEY_VIOLATION }, (err) => {
						throw new ForeignKeyConstraintError(err as any as CodedError)
					}).then(createResult)
				}

				const rollback: InternalRollback = () => {
					const promise = this.executeSql('ROLLBACK;')
					close()
					return promise.return()
				}

				const commit: InternalCommit = () => {
					const promise = this.executeSql('COMMIT;')
					close()
					return promise.return()
				}

				super(executeSql, rollback, commit, stackTraceErr)
			}

			public tableList(extraWhereClause: string | Callback<Result> = '', callback?: Callback<Result>) {
				if (callback == null  && _.isFunction(extraWhereClause)) {
					callback = extraWhereClause
					extraWhereClause = ''
				}
				if (extraWhereClause !== '') {
					extraWhereClause = 'WHERE ' + extraWhereClause
				}
				return this.executeSql(`
					SELECT *
					FROM (
						SELECT tablename as name
						FROM pg_tables
						WHERE schemaname = 'public'
					) t ${extraWhereClause};
				`, [], callback)
			}
		}
		return _.extend({
			engine: 'postgres',
			executeSql: atomicExecuteSql,
			transaction: createTransaction((stackTraceErr) =>
				connect()
				.then((client) => {
					const tx = new PostgresTx(client, client.release, stackTraceErr)
					tx.executeSql('START TRANSACTION;')
					return tx
				})
			),
		}, alwaysExport)
	}
}

let maybeMysql: typeof _mysql | undefined
try {
	maybeMysql = require('mysql')
} catch (e) {}
if (maybeMysql != null) {
	const mysql = maybeMysql
	engines.mysql = (options: _mysql.IPoolConfig): Database => {
		const MYSQL_UNIQUE_VIOLATION = 'ER_DUP_ENTRY'
		const MYSQL_FOREIGN_KEY_VIOLATION = 'ER_ROW_IS_REFERENCED'
		const pool = mysql.createPool(options)
		pool.on('connection', (db) => {
			db.query("SET sql_mode='ANSI_QUOTES';")
		})
		const connect = Promise.promisify(pool.getConnection, { context: pool })

		interface MysqlRowArray extends Array<{}> {
			affectedRows: number
			insertId?: number
		}
		const createResult = (rows: MysqlRowArray): Result => {
			return {
				rows: {
					length: (rows != null ? rows.length : 0) || 0,
					item: (i) => rows[i],
					forEach: (iterator, thisArg) => {
						rows.forEach(iterator, thisArg)
					},
					map: (iterator, thisArg) => rows.map(iterator, thisArg),
				},
				rowsAffected: rows.affectedRows,
				insertId: rows.insertId,
			}
		}
		class MySqlTx extends Tx {
			constructor(db: _mysql.IConnection, close: CloseTransactionFn, stackTraceErr?: Error) {
				const executeSql: InternalExecuteSql = (sql, bindings) => {
					return Promise.fromCallback((callback) => {
						db.query(sql, bindings, callback)
					}).catch({ code: MYSQL_UNIQUE_VIOLATION }, (err) => {
						// We know that the type is an IError for mysql, but typescript doesn't like the catch obj sugar
						throw new UniqueConstraintError(err as _mysql.IError)
					}).catch({ code: MYSQL_FOREIGN_KEY_VIOLATION }, (err) => {
						throw new ForeignKeyConstraintError(err as _mysql.IError)
					}).then(createResult)
				}

				const rollback: InternalRollback = () => {
					const promise = this.executeSql('ROLLBACK;')
					close()
					return promise.return()
				}

				const commit: InternalCommit = () => {
					const promise = this.executeSql('COMMIT;')
					close()
					return promise.return()
				}

				super(executeSql, rollback, commit, stackTraceErr)
			}

			public tableList(extraWhereClause: string | Callback<Result> = '', callback?: Callback<Result>) {
				if (callback == null  && _.isFunction(extraWhereClause)) {
					callback = extraWhereClause
					extraWhereClause = ''
				}
				if (extraWhereClause !== '') {
					extraWhereClause = ' WHERE ' + extraWhereClause
				}
				return this.executeSql(`
					SELECT name
					FROM (
						SELECT table_name AS name
						FROM information_schema.tables
						WHERE table_schema = ?
					) t ${extraWhereClause};
				`, [options.database], callback)
			}
		}

		return _.extend({
			engine: 'mysql',
			executeSql: atomicExecuteSql,
			transaction: createTransaction((stackTraceErr) =>
				connect()
				.then((client) => {
					const close = () => client.release()
					const tx = new MySqlTx(client, close, stackTraceErr)
					tx.executeSql('START TRANSACTION;')
					return tx
				})
			),
		}, alwaysExport)
	}
}

if (typeof window !== 'undefined' && window.openDatabase != null) {
	interface WebSqlResult {
		insertId?: number
		rowsAffected: number
		rows: {
			item: (i: number) => {}
			length: number
		}
	}
	type AsyncQuery = [
		Sql, Bindings, SQLStatementCallback, SQLStatementErrorCallback
	]
	engines.websql = (databaseName: string): Database => {
		const WEBSQL_CONSTRAINT_ERR = 6

		const db = window.openDatabase(databaseName, '1.0', 'rulemotion', 2 * 1024 * 1024)
		const getInsertId = (result: WebSqlResult) => {
			// Ignore the potential DOM exception.
			try {
				return result.insertId
			} catch (e) {}
		}
		const createResult = (result: WebSqlResult): Result => {
			return {
				rows: {
					length: result.rows.length,
					item: (i) => _.clone(result.rows.item(i)),
					forEach: (iterator, thisArg) => {
						this.map(iterator, thisArg)
					},
					map: (iterator, thisArg) => {
						return _.times(result.rows.length, (i) => {
							return iterator.call(thisArg, this.item(i), i, result.rows)
						})
					},
				},
				rowsAffected: result.rowsAffected,
				insertId: getInsertId(result),
			}
		}

		class WebSqlTx extends Tx {
			constructor(tx: SQLTransaction, stackTraceErr?: Error) {
				let running = true
				let queue: AsyncQuery[] = []
				// This function is used to recurse executeSql calls and keep the transaction open,
				// allowing us to use async calls within the API.
				const asyncRecurse = () => {
					let args: AsyncQuery | undefined
					while (args = queue.pop()) {
						console.debug('Running', args[0])
						tx.executeSql(args[0], args[1], args[2], args[3])
					}
					if (running) {
						console.debug('Looping')
						tx.executeSql('SELECT 0', [], asyncRecurse)
					}
				}
				asyncRecurse()

				const executeSql = (sql: Sql, bindings: Bindings) => {
					return new Promise((resolve, reject) => {
						const boundSql = bindDefaultValues(sql, bindings)

						const successCallback: SQLStatementCallback = (_tx, results) => {
							resolve(results)
						}
						const errorCallback: SQLStatementErrorCallback = (_tx, err) => {
							reject(err)
							return false
						}

						queue.push([boundSql, bindings, successCallback, errorCallback])
					}).catch({ code: WEBSQL_CONSTRAINT_ERR }, () => {
						throw new ConstraintError('Constraint failed.')
					}).then(createResult)
				}

				const rollback: InternalRollback = () => {
					return new Promise((resolve) => {
						const successCallback: SQLStatementCallback = () => {
							resolve()
							throw new Error('Rollback')
						}
						const errorCallback: SQLStatementErrorCallback = () => {
							resolve()
							return true
						}
						queue = [['RUN A FAILING STATEMENT TO ROLLBACK', [], successCallback, errorCallback]]
						running = false
					})
				}

				const commit: InternalCommit = () => {
					running = false
					return Promise.resolve()
				}

				super(executeSql, rollback, commit, stackTraceErr)
			}

			public tableList(extraWhereClause: string | Callback<Result> = '', callback?: Callback<Result>) {
				if (callback == null  && _.isFunction(extraWhereClause)) {
					callback = extraWhereClause
					extraWhereClause = ''
				}
				if (extraWhereClause !== '') {
					extraWhereClause = ' AND ' + extraWhereClause
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
				`, [], callback)
			}
		}

		return _.extend({
			engine: 'websql',
			executeSql: atomicExecuteSql,
			transaction: createTransaction((stackTraceErr) =>
				new Promise((resolve) => {
					db.transaction((tx) => {
						resolve(new WebSqlTx(tx, stackTraceErr))
					})
				})
			),
		}, alwaysExport)
	}
}

export const connect = (databaseOptions: { engine: string, params: {} }) => {
	if (engines[databaseOptions.engine] == null) {
		throw new Error('Unsupported database engine: ' + databaseOptions.engine)
	}
	return engines[databaseOptions.engine](databaseOptions.params)
}

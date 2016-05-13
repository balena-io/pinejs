_ = require 'lodash'
Promise = require 'bluebird'
{ SQLBinds } = require './SQLBinds.ometajs'
TypedError = require 'typed-error'

class DatabaseError extends TypedError
	constructor: (message) ->
		# If the message has a code then use that as our code.
		if message?.code?
			@code = message.code
		# If this is a SQLError we have to handle it specially (since it's not an instance of Error)
		if message?.constructor.name is 'SQLError'
			message = message.message
		super(message)

class ConstraintError extends DatabaseError
class UniqueConstraintError extends ConstraintError
class ForeignKeyConstraintError extends ConstraintError

NotADatabaseError = (err) -> not (err instanceof DatabaseError)

DEFAULT_VALUE = {}
bindDefaultValues = (sql, bindings) ->
	if !_.some(bindings, (binding) -> binding is DEFAULT_VALUE)
		# We don't have to do any work if none of the bindings match DEFAULT_VALUE
		return sql
	bindNo = 0
	SQLBinds.matchAll(sql, 'Parse', [ ->
		if bindings[bindNo] == DEFAULT_VALUE
			bindings.splice(bindNo, 1)
			'DEFAULT'
		else
			bindNo++
			'?'
	])

alwaysExport = {
	DEFAULT_VALUE
	DatabaseError
	ConstraintError
	UniqueConstraintError
	ForeignKeyConstraintError
}

atomicExecuteSql = (sql, bindings, callback) ->
	@transaction()
	.then (tx) ->
		result = tx.executeSql(sql, bindings)
		# Use finally so that we do not modify the return of the result and will still trigger bluebird's possibly unhandled exception when relevant.
		return result.finally ->
			# It is ok to use synchronous inspection of the promise here since this block will only be run once the promise is resolved.
			if result.isRejected()
				tx.rollback()
			else
				tx.end()
	.nodeify(callback)

class Tx
	if process.env.TRANSACTION_TIMEOUT_MS
		timeoutMS = parseInt(process.env.TRANSACTION_TIMEOUT_MS)
		if _.isNaN(timeoutMS) or timeoutMS <= 0
			throw new Error("Invalid valid for TRANSACTION_TIMEOUT_MS: #{process.env.TRANSACTION_TIMEOUT_MS}")
	else
		timeoutMS = 10000

	constructor: (stackTraceErr, executeSql, rollback, end) ->
		automaticClose = =>
			console.error('Transaction still open after ' + timeoutMS + 'ms without an execute call.', stackTraceErr.stack)
			@rollback()
		pendingExecutes = do ->
			automaticCloseTimeout = setTimeout(automaticClose, timeoutMS)
			pending = 0
			return {
				increment: ->
					if pending is false
						return
					pending++
					clearTimeout(automaticCloseTimeout)
				decrement: ->
					if pending is false
						return
					pending--
					# We only ever want one timeout running at a time, hence not using <=
					if pending is 0
						automaticCloseTimeout = setTimeout(automaticClose, timeoutMS)
					else if pending < 0
						console.error('Pending transactions is less than 0, wtf?')
						pending = 0
				cancel: ->
					# Set pending to false to cancel all pending.
					pending = false
					clearTimeout(automaticCloseTimeout)
			}

		@executeSql = (sql, bindings = [], callback, args...) ->
			pendingExecutes.increment()

			sql = bindDefaultValues(sql, bindings)

			executeSql(sql, bindings, args...)
			.finally(pendingExecutes.decrement)
			.catch NotADatabaseError, (err) ->
				# Wrap the error so we can catch it easier later
				throw new DatabaseError(err)
			.nodeify(callback)

		@rollback = (callback) ->
			promise = rollback()
			closeTransaction('Transaction has been rolled back.')

			return promise.nodeify(callback)

		@end = (callback) ->
			promise = end()
			closeTransaction('Transaction has been ended.')

			return promise.nodeify(callback)

		closeTransaction = (message) =>
			pendingExecutes.cancel()
			rejectionValue = new Error(message)
			# We return a new rejected promise on each call so that bluebird can handle
			# logging errors if the rejection is not handled (but only if it is not handled)
			@executeSql = (sql, bindings, callback) ->
				return Promise.rejected(rejectionValue).nodeify(callback)
			@rollback = @end = (callback) ->
				return Promise.rejected(rejectionValue).nodeify(callback)

createTransaction = (createFunc) ->
	(callback) ->
		stackTraceErr = new Error()

		promise = new Promise (resolve, reject) ->
			createFunc(resolve, reject, stackTraceErr)

		if callback?
			promise.tap(callback).catch (err) ->
				console.error(err, callback)
		return promise

try
	pg = require('pg')
if pg?
	exports.postgres = (connectString) ->
		PG_UNIQUE_VIOLATION = '23505'
		PG_FOREIGN_KEY_VIOLATION = '23503'

		createResult = ({ rowCount, rows }) ->
			return {
				rows:
					length: rows?.length or 0
					item: (i) -> rows[i]
					forEach: (iterator, thisArg) ->
						rows.forEach(iterator, thisArg)
					map: (iterator, thisArg) ->
						rows.map(iterator, thisArg)
				rowsAffected: rowCount
				insertId: rows[0]?.id || null
			}
		class PostgresTx extends Tx
			constructor: (_db, _close, _stackTraceErr) ->
				executeSql = (sql, bindings, addReturning = false) ->
					bindings = bindings.slice(0) # Deal with the fact we may splice arrays directly into bindings
					if addReturning and /^\s*INSERT\s+INTO/i.test(sql)
						sql = sql.replace(/;?$/, ' RETURNING "' + addReturning + '";')

					# We only need to perform the bind replacements if there is at least one binding!
					if _.includes(sql, '?')
						bindNo = 0
						sql = SQLBinds.matchAll(sql, 'Parse', [ ->
							if Array.isArray(bindings[bindNo])
								initialBindNo = bindNo
								bindString = (
									for binding in bindings[initialBindNo]
										'$' + ++bindNo
								).join(',')
								Array.prototype.splice.apply(bindings, [initialBindNo, 1].concat(bindings[initialBindNo]))
								return bindString
							else if bindings[bindNo] == DEFAULT_VALUE
								bindings.splice(bindNo, 1)
								return 'DEFAULT'
							else
								return '$' + ++bindNo
						])

					Promise.fromCallback (callback) ->
						_db.query({ text: sql, values: bindings }, callback)
					.catch code: PG_UNIQUE_VIOLATION, (err) ->
						throw new UniqueConstraintError(err)
					.catch code: PG_FOREIGN_KEY_VIOLATION, (err) ->
						throw new ForeignKeyConstraintError(err)
					.then(createResult)

				rollback = =>
					promise = @executeSql('ROLLBACK;')
					_close()
					return promise

				end = =>
					promise = @executeSql('COMMIT;')
					_close()
					return promise

				super(_stackTraceErr, executeSql, rollback, end)

			tableList: (extraWhereClause = '', callback) ->
				if !callback? and _.isFunction(extraWhereClause)
					callback = extraWhereClause
					extraWhereClause = ''
				if extraWhereClause != ''
					extraWhereClause = 'WHERE ' + extraWhereClause
				@executeSql("SELECT * FROM (SELECT tablename as name FROM pg_tables WHERE schemaname = 'public') t #{extraWhereClause};", [], callback)
			dropTable: (tableName, ifExists = true, callback) ->
				@executeSql('DROP TABLE ' + (if ifExists is true then 'IF EXISTS ' else '') + '"' + tableName + '" CASCADE;', [], callback)
		return _.extend({
			engine: 'postgres'
			executeSql: atomicExecuteSql
			transaction: createTransaction (resolve, reject, stackTraceErr) ->
				pg.connect connectString, (err, client, done) ->
					if err
						console.error('Error connecting', err, err.stack)
						process.exit()
					tx = new PostgresTx(client, done, stackTraceErr)
					if process.env.PG_SCHEMA?
						tx.executeSql('SET search_path TO "' + process.env.PG_SCHEMA + '"')
					tx.executeSql('START TRANSACTION;')

					resolve(tx)
		}, alwaysExport)

try
	mysql = require('mysql')
if mysql?
	exports.mysql = (options) ->
		MYSQL_UNIQUE_VIOLATION = 'ER_DUP_ENTRY'
		MYSQL_FOREIGN_KEY_VIOLATION = 'ER_ROW_IS_REFERENCED'
		_pool = mysql.createPool(options)
		_pool.on 'connection', (_db) ->
			_db.query("SET sql_mode='ANSI_QUOTES';")

		createResult = (rows) ->
			return {
				rows:
					length: rows?.length or 0
					item: (i) -> rows[i]
					forEach: (iterator, thisArg) ->
						rows.forEach(iterator, thisArg)
					map: (iterator, thisArg) ->
						rows.map(iterator, thisArg)
				rowsAffected: rows.affectedRows
				insertId: rows.insertId || null
			}
		class MySqlTx extends Tx
			constructor: (_db, _close, _stackTraceErr) ->
				executeSql = (sql, bindings) ->
					Promise.fromCallback (callback) ->
						_db.query(sql, bindings, callback)
					.catch code: MYSQL_UNIQUE_VIOLATION, (err) ->
						throw new UniqueConstraintError(err)
					.catch code: MYSQL_FOREIGN_KEY_VIOLATION, (err) ->
						throw new ForeignKeyConstraintError(err)
					.then(createResult)

				rollback = =>
					promise = @executeSql('ROLLBACK;')
					_close()
					return promise

				end = =>
					promise = @executeSql('COMMIT;')
					_close()
					return promise

				super(_stackTraceErr, executeSql, rollback, end)

			tableList: (extraWhereClause = '', callback) ->
				if !callback? and _.isFunction(extraWhereClause)
					callback = extraWhereClause
					extraWhereClause = ''
				if extraWhereClause != ''
					extraWhereClause = ' WHERE ' + extraWhereClause
				@executeSql('SELECT name FROM (SELECT table_name as name FROM information_schema.tables WHERE table_schema = ?) t' + extraWhereClause + ';', [options.database], callback)
			dropTable: (tableName, ifExists = true, callback) ->
				@executeSql('DROP TABLE ' + (if ifExists is true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback)
		return _.extend({
			engine: 'mysql'
			executeSql: atomicExecuteSql
			transaction: createTransaction (resolve, reject, stackTraceErr) ->
				_pool.getConnection (err, _db) ->
					if err
						console.error('Error connecting', err, err.stack)
						process.exit()
					_close = ->
						_db.release()
					tx = new MySqlTx(_db, _close, stackTraceErr)
					tx.executeSql('START TRANSACTION;')

					resolve(tx)
		}, alwaysExport)

if openDatabase?
	exports.websql = (databaseName) ->
		WEBSQL_CONSTRAINT_ERR = 6

		_db = openDatabase(databaseName, '1.0', 'rulemotion', 2 * 1024 * 1024)
		getInsertId = (result) ->
			# Ignore the potential DOM exception.
			try
				return result.insertId
		createResult = (result) ->
			return {
				rows:
					length: result.rows.length
					item: (i) -> _.clone(result.rows.item(i))
					forEach: (args...) ->
						@map(args...)
						return
					map: (iterator, thisArg) ->
						for i in [0...result.rows.length] by 1
							iterator.call(thisArg, @item(i), i, result.rows)
				rowsAffected: result.rowsAffected
				insertId: getInsertId(result)
			}

		class WebSqlTx extends Tx
			constructor: (_tx, _stackTraceErr) ->
				running = true
				queue = []
				# This function is used to recurse executeSql calls and keep the transaction open,
				# allowing us to use async calls within the API.
				asyncRecurse = ->
					while args = queue.pop()
						console.debug('Running', args[0])
						_tx.executeSql(args...)
					if running is true
						console.debug('Looping')
						_tx.executeSql('SELECT 0', [], asyncRecurse)
				asyncRecurse()

				executeSql = (sql, bindings) ->
					new Promise (resolve, reject) ->
						sql = bindDefaultValues(sql, bindings)

						successCallback = (_tx, _results) ->
							resolve(_results)
						errorCallback = (_tx, err) ->
							reject(err)

						queue.push([sql, bindings, successCallback, errorCallback])
					.catch code: WEBSQL_CONSTRAINT_ERR, ->
						throw new ConstraintError('Constraint failed.')
					.then(createResult)

				rollback = ->
					new Promise (resolve) ->
						successCallback = ->
							resolve()
							throw new Error('Rollback')
						errorCallback = ->
							resolve()
							return true
						queue = [['RUN A FAILING STATEMENT TO ROLLBACK', [], successCallback, errorCallback]]
						running = false

				end = ->
					running = false
					return Promise.fulfilled()

				super(_stackTraceErr, executeSql, rollback, end)

			tableList: (extraWhereClause = '', callback) ->
				if !callback? and _.isFunction(extraWhereClause)
					callback = extraWhereClause
					extraWhereClause = ''
				if extraWhereClause != ''
					extraWhereClause = ' AND ' + extraWhereClause
				@executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('__WebKitDatabaseInfoTable__', 'sqlite_sequence')" + extraWhereClause + ';', [], callback)

			dropTable: (tableName, ifExists = true, callback) ->
				@executeSql('DROP TABLE ' + (if ifExists is true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback)

		return _.extend({
			engine: 'websql'
			executeSql: atomicExecuteSql
			transaction: createTransaction (resolve, reject, stackTraceErr) ->
				_db.transaction (_tx) ->
					resolve(new WebSqlTx(_tx, stackTraceErr))
		}, alwaysExport)

exports.connect = (databaseOptions) ->
	if !exports[databaseOptions.engine]? or databaseOptions.engine is 'connect'
		throw new Error('Unsupported database engine: ' + databaseOptions.engine)
	return exports[databaseOptions.engine](databaseOptions.params)

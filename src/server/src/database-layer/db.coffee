define ['has', 'bluebird', 'lodash', 'ometa!database-layer/SQLBinds'], (has, Promise, _, SQLBinds) ->
	exports = {}
	DEFAULT_VALUE = {}
	bindDefaultValues = (sql, bindings) ->
		bindNo = 0
		SQLBinds.matchAll(sql, 'parse', [->
			if bindings[bindNo] == DEFAULT_VALUE
				bindings.splice(bindNo, 1)
				'DEFAULT'
			else
				bindNo++
				'?'
		])

	getStackTrace = ->
		try
			throw new Error()
		catch e
			stack = e.stack
			for i in [0...2]
				stack = stack.substring(stack.indexOf('\n') + 1)
			return stack

	class Tx
		timeoutMS = 1000
		constructor: (stackTrace, executeSql, rollback, end) ->
			automaticClose = =>
				console.error('Transaction still open after ' + timeoutMS + 'ms without an execute call.', stackTrace)
				@rollback()
			pendingExecutes = do ->
				automaticCloseTimeout = setTimeout(automaticClose, timeoutMS)
				pending = 0
				return {
					increment: ->
						pending++
						clearTimeout(automaticCloseTimeout)
					decrement: ->
						pending--
						# We only ever want one timeout running at a time, hence not using <=
						if pending is 0
							automaticCloseTimeout = setTimeout(automaticClose, timeoutMS)
						else if pending < 0
							console.warn('Pending transactions is less than 0, wtf?')
							pending = 0
					cancel: ->
						@increment = @decrement = ->
						clearTimeout(automaticCloseTimeout)
				}

			@executeSql = (sql, bindings = [], callback, args...) ->
				pendingExecutes.increment()
				deferred = Promise.pending()

				sql = bindDefaultValues(sql, bindings)
				executeSql(sql, bindings, deferred, args...)
				deferred.promise.finally ->
					# We wrap the decrement so that we play nicely if the pendingExecutes have been cancelled.
					pendingExecutes.decrement()

				return deferred.promise.nodeify(callback)

			@rollback = (callback) ->
				deferred = Promise.pending()

				rollback(deferred)
				closeTransaction('Transaction has been rolled back.')

				return deferred.promise.nodeify(callback)

			@end = (callback) ->
				deferred = Promise.pending()

				end(deferred)
				closeTransaction('Transaction has been ended.')

				return deferred.promise.nodeify(callback)

			closeTransaction = (message) =>
				pendingExecutes.cancel()
				# _stackTrace = getStackTrace()
				promise = Promise.rejected(new Error(message))
				@executeSql = (sql, bindings, callback) ->
					# console.error(message, _stackTrace)
					# console.trace()
					return promise.nodeify(callback)
				@rollback = @end = (sql, bindings, callback) ->
					# console.error(message, _stackTrace)
					# console.trace()
					return promise.nodeify(callback)

	if has 'ENV_NODEJS'
		exports.postgres = (connectString) ->
			pg = require('pg')
			createResult = ({rowCount, rows}) ->
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
				constructor: (_db, _close, _stackTrace) ->
					executeSql = (sql, bindings, deferred, addReturning = true) ->
						bindings = bindings.slice(0) # Deal with the fact we may splice arrays directly into bindings
						if addReturning and /^\s*INSERT\s+INTO/i.test(sql)
							sql = sql.replace(/;?$/, ' RETURNING id;')
						bindNo = 0
						sql = SQLBinds.matchAll(sql, 'parse', [
							->
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
						_db.query {text: sql, values: bindings}, (err, res) ->
							if err
								console.warn(sql, bindings, err)
								deferred.reject(err)
							else
								deferred.fulfill(createResult(res))

					rollback = (deferred) =>
						deferred.fulfill(@executeSql('ROLLBACK;'))
						_close()

					end = (deferred) =>
						deferred.fulfill(@executeSql('COMMIT;'))
						_close()

					super(_stackTrace, executeSql, rollback, end)

				tableList: (extraWhereClause = '', callback) ->
					if !callback? and typeof extraWhereClause is 'function'
						callback = extraWhereClause
						extraWhereClause = ''
					if extraWhereClause != ''
						extraWhereClause = ' WHERE ' + extraWhereClause
					@executeSql("SELECT * FROM (SELECT tablename as name FROM pg_tables WHERE schemaname = 'public') t" + extraWhereClause + ";", [], callback)
				dropTable: (tableName, ifExists = true, callback) ->
					@executeSql('DROP TABLE ' + (if ifExists is true then 'IF EXISTS ' else '') + '"' + tableName + '" CASCADE;', [], callback)
			return {
				DEFAULT_VALUE
				engine: 'postgres'
				transaction: (callback) ->
					stackTrace = getStackTrace()
					deferred = Promise.pending()

					pg.connect connectString, (err, client, done) ->
						if err
							console.error('Error connecting', err, err.stack)
							process.exit()
						tx = new PostgresTx(client, done, stackTrace)
						if process.env.PG_SCHEMA?
							tx.executeSql('SET search_path TO "' + process.env.PG_SCHEMA + '"')
						tx.executeSql('START TRANSACTION;')

						deferred.fulfill(tx)

					deferred.promise.then(callback).catch (err) ->
						console.error(err, callback)
					return deferred.promise
			}

		exports.mysql = (options) ->
			mysql = new require('mysql')
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
				constructor: (_db, _close, _stackTrace) ->
					executeSql = (sql, bindings, deferred) ->
						_db.query sql, bindings, (err, res) ->
							if err
								console.warn(sql, bindings, err)
								deferred.reject(err)
							else
								deferred.fulfill(createResult(res))

					rollback = (deferred) =>
						deferred.fulfill(@executeSql('ROLLBACK;'))
						_close()

					end = (deferred) =>
						deferred.fulfill(@executeSql('COMMIT;'))
						_close()

					super(_stackTrace, executeSql, rollback, end)

				tableList: (extraWhereClause = '', callback) ->
					if !callback? and typeof extraWhereClause is 'function'
						callback = extraWhereClause
						extraWhereClause = ''
					if extraWhereClause != ''
						extraWhereClause = ' WHERE ' + extraWhereClause
					@executeSql("SELECT name FROM (SELECT table_name as name FROM information_schema.tables WHERE table_schema = ?) t" + extraWhereClause + ";", [options.database], callback)
				dropTable: (tableName, ifExists = true, callback) ->
					@executeSql('DROP TABLE ' + (if ifExists is true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback)
			return {
				DEFAULT_VALUE
				engine: 'mysql'
				transaction: (callback) ->
					stackTrace = getStackTrace()
					deferred = Promise.pending()

					_pool.getConnection (err, _db) ->
						if err
							console.error('Error connecting', err, err.stack)
							process.exit()
						_close = ->
							_db.release()
						tx = new MySqlTx(_db, _close, stackTrace)
						tx.executeSql('START TRANSACTION;')

						deferred.fulfill(tx)

					deferred.promise.then(callback).catch (err) ->
						console.error(err, callback)
					return deferred.promise
			}
	else
		exports.websql = (databaseName) ->
			_db = openDatabase(databaseName, '1.0', 'rulemotion', 2 * 1024 * 1024)
			createResult = (result) ->
				try
					insertId = result.insertId
				catch e
					insertId = null
					# Ignore the potential DOM exception.
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
					insertId: insertId
				}
			
			class WebSqlTx extends Tx
				constructor: (_tx, _stackTrace) ->
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

					executeSql = (sql, bindings, deferred) ->
						# This is used so we can find the useful part of the stack trace, as WebSQL is asynchronous and starts a new stack.
						stackTrace = getStackTrace()

						successCallback = (_tx, _results) =>
							deferred.fulfill(createResult(_results))
						errorCallback = (_tx, err) =>
							console.warn(sql, bindings, err, stackTrace)
							deferred.reject(err)

						sql = bindDefaultValues(sql, bindings)
						queue.push([sql, bindings, successCallback, errorCallback])

					rollback = (deferred) ->
						successCallback = ->
							deferred.fulfill()
							throw 'Rollback'
						errorCallback = ->
							deferred.fulfill()
							return true
						queue = [['RUN A FAILING STATEMENT TO ROLLBACK', [], successCallback, errorCallback]]
						running = false

					end = (deferred) ->
						deferred.fulfill()
						running = false

					super(_stackTrace, executeSql, rollback, end)

				tableList: (extraWhereClause = '', callback) ->
					if !callback? and typeof extraWhereClause is 'function'
						callback = extraWhereClause
						extraWhereClause = ''
					if extraWhereClause != ''
						extraWhereClause = ' AND ' + extraWhereClause
					@executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('__WebKitDatabaseInfoTable__', 'sqlite_sequence')" + extraWhereClause + ';', [], callback)

				dropTable: (tableName, ifExists = true, callback) ->
					@executeSql('DROP TABLE ' + (if ifExists is true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback)

			return {
				DEFAULT_VALUE
				engine: 'websql'
				transaction: (callback) ->
					stackTrace = getStackTrace()

					_db.transaction (_tx) ->
						deferred.fulfill(new WebSqlTx(_tx, stackTrace))

					deferred = Promise.pending()
					deferred.promise.then(callback).catch (err) ->
						console.error(err, callback)
					return deferred.promise
			}

	exports.connect = (databaseOptions) ->
		if !exports[databaseOptions.engine]? or databaseOptions.engine is 'connect'
			throw 'Unsupported database engine: ' + databaseOptions.engine
		return exports[databaseOptions.engine](databaseOptions.params)

	return exports

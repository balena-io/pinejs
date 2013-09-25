define(['ometa!database-layer/SQLBinds', 'has', 'lodash'], (SQLBinds, has, _) ->
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

	if has 'ENV_NODEJS'
		wrapExecuteSql = (closeCallback) ->
			currentlyQueuedStatements = 0
			connectionClosed = false
			closeConnection = ->
				if connectionClosed is false
					connectionClosed = true
					closeCallback()
			createEndQueryCallback = (callback) ->
				(err, res) ->
					# If the connection has been closed we should not call either callback to match WebSQL.
					if connectionClosed is true
						return
					try
						carryOn = callback(err, res) 
					catch e
						console.error('Statement callback threw an error: ', e)
						carryOn = false
						throw e
					finally
						# We have finished a statement so remove it.
						currentlyQueuedStatements--
						if currentlyQueuedStatements < 0
							console.trace('currentlyQueuedStatements is less than 0!')
						# Check if there are no queued statements after the callback has had a chance to remove them and close the connection if there are none queued.
						if currentlyQueuedStatements <= 0 or carryOn is false
							closeConnection()
						# if carryOn is false
							# TODO: Call the transaction error callback..
			return {
				forceOpen: (bool, callback) ->
					if bool is true
						currentlyQueuedStatements++
					else
						currentlyQueuedStatements--
					try
						callback?()
					finally
						if currentlyQueuedStatements < 0
							console.trace('currentlyQueuedStatements is less than 0!')
						if currentlyQueuedStatements <= 0
							closeConnection()
				startQuery: (createResult, callback) ->
					(sql, bindings = [], successCallback, errorCallback, args...) ->
						if connectionClosed is true
							throw 'Trying to executeSQL on a closed connection'
						# We have queued a new statement so add it.
						currentlyQueuedStatements++
						sql = bindDefaultValues(sql, bindings)
						endQueryCallback = createEndQueryCallback (err, res) =>
							if err
								if typeof errorCallback is 'function'
									return errorCallback(@, err)
								console.error(sql, bindings, err)
								return false
							successCallback?(@, createResult(res))
							return true
						callback(sql, bindings, endQueryCallback, args...)
				closeConnection
			}

		exports.postgres = (connectString) ->
			pg = require('pg')
			createResult = ({rowCount, rows}) ->
				return {
					rows:
						length: rows?.length or 0
						item: (i) -> rows[i]
						forEach: (iterator, thisArg) ->
							rows.forEach(iterator, thisArg)
					rowsAffected: rowCount
					insertId: rows[0]?.id || null
				}
			class Tx
				constructor: (_db, _close) ->
					{startQuery, @forceOpen, @closeConnection} = wrapExecuteSql =>
						_db.query('COMMIT;') # We end the transaction in progress and then close the connection/return to pool.
						_close()

					@executeSql = startQuery createResult, (sql, _bindings, endQueryCallback, addReturning = true) ->
						bindings = _bindings.slice(0) # Deal with the fact we may splice arrays directly into bindings
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
						_db.query({text: sql, values: bindings}, endQueryCallback)
				rollback: ->
					@executeSql('ROLLBACK;')
					@closeConnection()
				end: ->
					@closeConnection()
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' WHERE ' + extraWhereClause
					@executeSql("SELECT * FROM (SELECT tablename as name FROM pg_tables WHERE schemaname = 'public') t" + extraWhereClause + ";", [], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> @executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '" CASCADE;', [], callback, errorCallback)
			return {
				DEFAULT_VALUE
				engine: 'postgres'
				transaction: (callback, errorCallback) ->
					pg.connect(connectString, (err, client, done) ->
						if err
							console.error('Error connecting ' + err)
							errorCallback?(err)
						else
							tx = new Tx(client, done)
							if process.env.PG_SCHEMA?
								tx.executeSql('SET search_path TO "' + process.env.PG_SCHEMA + '"')
							tx.executeSql('START TRANSACTION;')
							callback(tx)
					)
			}
			
		exports.mysql = (options) ->
			mysql = new require('mysql')
			_pool = mysql.createPool(options)
			_pool.on 'connection', (err, _db) ->
				_db.query("SET sql_mode='ANSI_QUOTES';")

			createResult = (rows) ->
				return {
					rows:
						length: rows?.length or 0
						item: (i) -> rows[i]
						forEach: (iterator, thisArg) ->
							rows.forEach(iterator, thisArg)
					rowsAffected: rows.affectedRows
					insertId: rows.insertId || null
				}
			class Tx
				constructor: (_db) ->
					lastCallback = null
					{startQuery, @forceOpen, @closeConnection} = wrapExecuteSql =>
						_db.query('COMMIT;') # We end the transaction in progress and then close the connection/return to pool.
						_db.end()

					@executeSql = startQuery createResult, (sql, bindings, endQueryCallback) ->
						_db.query(sql, bindings, endQueryCallback)
				rollback: ->
					@executeSql('ROLLBACK;')
					@closeConnection()
				end: ->
					@closeConnection()
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' WHERE ' + extraWhereClause
					@executeSql("SELECT name FROM (SELECT table_name as name FROM information_schema.tables WHERE table_schema = ?) t" + extraWhereClause + ";", [options.database], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> @executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
			return {
				DEFAULT_VALUE
				engine: 'mysql'
				transaction: (callback, errorCallback) ->
					_pool.getConnection((err, _db) ->
						if err
							console.error('Error connecting ' + err)
							errorCallback?(err)
						else
							tx = new Tx(_db)
							tx.executeSql('START TRANSACTION;')
							callback(tx)
					)
			}

		exports.sqlite = (filepath) ->
			console.warn('SQLite support is out of date and likely to break')
			sqlite3 = require('sqlite3').verbose()
			_db = new sqlite3.Database(filepath)
			createResult = (rows) ->
				return {
					rows:
						length: rows?.length or 0
						item: (i) -> rows[i]
						forEach: (iterator, thisArg) ->
							rows.forEach(iterator, thisArg)
					insertId: rows.insertId || null
				}
			tx = {
				executeSql: (sql, bindings, callback, errorCallback) =>
					sql = bindDefaultValues(sql, bindings)
					_db.all sql, bindings ? [], (err, rows) =>
						if err?
							errorCallback?(@, err)
							console.log(sql, err)
						else
							callback?(@, createResult(rows))
				begin: -> @executeSql('BEGIN;')
				end: -> @executeSql('END;')
				rollback: -> @executeSql('ROLLBACK;')
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' AND ' + extraWhereClause
					@executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_sequence')" + extraWhereClause + ";", [], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> @executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
				forceOpen: do ->
					warned = false
					(bool, callback) ->
						if warned is false
							warned = true
							console.warn('Force open not implemented for sqlite.')
						callback?()
			}
			return {
				DEFAULT_VALUE
				engine: 'sqlite'
				transaction: (callback) ->
					_db.serialize () ->
						callback(tx)
			}
	else
		exports.websql = (databaseName) ->
			_db = openDatabase(databaseName, "1.0", "rulemotion", 2 * 1024 * 1024)
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
						forEach: (iterator, thisArg) ->
							for i in [0...result.rows.length] by 1
								iterator.call(thisArg, @item(i), i, result.rows)
					rowsAffected: result.rowsAffected 
					insertId: insertId
				}
			class Tx
				constructor: (_tx) ->
					@executeSql = (sql, bindings, callback, errorCallback) =>
						try
							# This is used so we can find the useful part of the stack trace, as WebSQL is asynchronous and starts a new stack.
							___STACK_TRACE___.please
						catch stackTrace
							null
							# Wrap the callbacks passed in with our own if necessary to pass in the wrapped tx.
							if callback?
								callback = do(callback) =>
									(_tx, _results) =>
										callback(@, createResult(_results))
							errorCallback = do(errorCallback) =>
								(_tx, err) =>
									if typeof errorCallback is 'function'
										return errorCallback(@, err)
									console.log(sql, bindings, err, stackTrace.stack)
									return false
							bindNo = 0
							sql = bindDefaultValues(sql, bindings)
							_tx.executeSql(sql, bindings, callback, errorCallback)
					@rollback = -> _tx.executeSql('RUN A FAILING STATEMENT TO ROLLBACK')
				end: ->
					@executeSql = ->
						throw 'Transaction has ended.'
				# Rollbacks in WebSQL are done by having a SQL statement error, and not having an error callback (or having one that returns false).
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' AND ' + extraWhereClause
					@executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('__WebKitDatabaseInfoTable__', 'sqlite_sequence')" + extraWhereClause + ";", [], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> @executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
				forceOpen: do ->
					warned = false
					(bool, callback) ->
						if warned is false
							warned = true
							console.warn('Cannot force open websql.')
						callback?()
			return {
				DEFAULT_VALUE
				engine: 'websql'
				transaction: (callback) ->
					_db.transaction( (_tx) ->
						callback(new Tx(_tx))
					)
			}
	exports.connect = (databaseOptions) ->
		if !exports[databaseOptions.engine]? or databaseOptions.engine is 'connect'
			throw 'Unsupported database engine: ' + databaseOptions.engine
		return exports[databaseOptions.engine](databaseOptions.params)

	return exports
)

define(["ometa!database-layer/SQLBinds", 'has'], (SQLBinds, has) ->
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

	wrapExecuteSql = (closeCallback) ->
		currentlyQueuedStatements = 0
		connectionClosed = false
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
					if connectionClosed is false and currentlyQueuedStatements <= 0
						connectionClosed = true
						closeCallback()
			startQuery: (callback) ->
				->
					if connectionClosed
						throw 'Trying to executeSQL on a closed connection'
					# We have queued a new statement so add it.
					currentlyQueuedStatements++
					callback(arguments...)
			endQuery: (callback) ->
				->
					try
						callback(arguments...)
					finally
						# We have finished a statement so remove it.
						currentlyQueuedStatements--
						if currentlyQueuedStatements < 0
							console.trace('currentlyQueuedStatements is less than 0!')
						# Check if there are no queued statements after the callback has had a chance to remove them and close the connection if there are none queued.
						if currentlyQueuedStatements <= 0
							connectionClosed = true
							closeCallback()
		}

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
					rowsAffected: rowCount
					insertId: rows[0]?.id || null
				}
			class Tx
				constructor: (_db, _close) ->
					{startQuery, endQuery, @forceOpen} = wrapExecuteSql =>
						if @_transOpen is true
							console.warn('Connection is closing, but a transaction is still in progress.')
							@.end() # We end the transaction in progress to keep things working as best as possible.
						_close()

					@executeSql = startQuery (sql, _bindings = [], callback, errorCallback, addReturning = true) =>
						bindings = _bindings.slice(0) # Deal with the fact we may splice arrays directly into bindings
						sql = sql.replace(/GROUP BY NULL/g, '') #HACK: Remove GROUP BY NULL for Postgres as it does not need/accept it.
						sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY') #HACK: Postgres uses SERIAL data type rather than auto increment
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
						_db.query({text: sql, values: bindings}, endQuery (err, res) =>
							if err?
								errorCallback?(@, err)
								console.log(sql, bindings, err)
							else
								callback?(@, createResult(res))
						)
				begin: ->
					@_transOpen = true
					@executeSql('START TRANSACTION;')
				end: ->
					@_transOpen = false
					@executeSql('COMMIT;')
				rollback: ->
					@_transOpen = false
					@executeSql('ROLLBACK;')
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
							callback(tx)
					)
			}
			
		exports.mysql = (options) ->
			mysql = new require('mysql')
			_pool = mysql.createPool(options)
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
					@_transOpen = false
					lastCallback = null
					{startQuery, endQuery, @forceOpen} = wrapExecuteSql =>
						if @_transOpen is true
							console.warn('Connection is closing, but a transaction is still in progress.')
							@.end() # We end the transaction in progress to keep things working as best as possible.
						_db.end()

					@executeSql = startQuery (sql, bindings = [], callback, errorCallback, addReturning = true) =>
						sql = sql.replace(/GROUP BY NULL/g, '') # HACK: Remove GROUP BY NULL for MySQL? as it does not need/accept? it.
						sql = sql.replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT') # HACK: MySQL uses AUTO_INCREMENT rather than AUTOINCREMENT.
						sql = sql.replace(/DROP CONSTRAINT/g, 'DROP FOREIGN KEY') # HACK: MySQL uses FOREIGN KEY rather than CONSTRAINT.
						sql = bindDefaultValues(sql, bindings)
						_db.query(sql, bindings, endQuery (err, res) =>
							if err?
								errorCallback?(@, err)
								console.log(sql, bindings, err)
							else
								callback?(@, createResult(res))
						)
				begin: ->
					@_transOpen = true
					@executeSql('START TRANSACTION;')
				end: ->
					@_transOpen = false
					@executeSql('COMMIT;')
				rollback: ->
					@_transOpen = false
					@executeSql('ROLLBACK;')
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
							_db.query("SET sql_mode='ANSI_QUOTES';")
							callback(new Tx(_db))
					)
			}
				
		exports.sqlite = (filepath) ->
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
						item: (i) -> result.rows.item(i)
						forEach: (iterator, thisArg) ->
							for i in [0...result.rows.length] by 1
								iterator.call(thisArg, result.rows.item(i), i, result.rows)
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
								(_tx, _err) =>
									console.log(sql, bindings, _err, stackTrace.stack)
									errorCallback?(@, _err)
							bindNo = 0
							sql = bindDefaultValues(sql, bindings)
							_tx.executeSql(sql, bindings, callback, errorCallback)
					@rollback = -> _tx.executeSql("DROP TABLE '__Fo0oFoo'")
				begin: ->
				end: ->
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

define(["ometa!database-layer/SQLBinds", 'has'], (SQLBinds, has) ->
	exports = {}
	if has 'ENV_NODEJS'
		exports.postgres = (connectString) ->
			pg = requirejs('pg')
			createResult = (rows) ->
				return {
					rows:
						length: rows?.length or 0
						item: (i) -> rows[i]
					insertId: rows[0]?.id || null
				}
			class Tx
				constructor: (_db) ->
					this.executeSql = (sql, _bindings = [], callback, errorCallback, addReturning = true) ->
						thisTX = this
						bindings = _bindings.slice(0) # Deal with the fact we may splice arrays directly into bindings
						sql = sql.replace(/GROUP BY NULL/g, '') #HACK: Remove GROUP BY NULL for Postgres as it does not need/accept it.
						sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY') #HACK: Postgres uses SERIAL data type rather than auto increment
						if addReturning and /^\s*INSERT\s+INTO/i.test(sql)
							sql = sql.replace(/;?$/, ' RETURNING id;')
							console.log(sql)
						bindNo = 0
						sql = SQLBinds.matchAll(sql, "parse", [
							->
								initialBindNo = bindNo
								bindString = '$' + ++bindNo
								if Array.isArray(bindings[initialBindNo])
									for i in bindings[initialBindNo][1..]
										bindString += ',' + '$' + ++bindNo
									Array.prototype.splice.apply(bindings, [initialBindNo, 1].concat(bindings[initialBindNo]))
								return bindString
						])
						_db.query({text: sql, values: bindings}, (err, res) ->
							if err?
								errorCallback?(thisTX, err)
								console.log(sql, bindings, err)
							else
								callback?(thisTX, createResult(res.rows))
						)
				begin: -> this.executeSql('BEGIN;')
				end: -> this.executeSql('END;')
				rollback: -> this.executeSql('ROLLBACK;')
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' WHERE ' + extraWhereClause
					this.executeSql("SELECT * FROM (SELECT tablename as name FROM pg_tables WHERE schemaname = 'public') t" + extraWhereClause + ";", [], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> this.executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '" CASCADE;', [], callback, errorCallback)
			return {
				transaction: (callback, errorCallback) ->
					pg.connect(connectString, (err, client) ->
						if err
							errorCallback?(err)
						else
							callback(new Tx(client))
					)
			}
			
		exports.mysql = (options) ->
			mysql = new requirejs('mysql')
			result = (rows) ->
				return {
					rows:
						length: rows?.length or 0
						item: (i) -> rows[i]
					insertId: rows.insertId || null
				}
			class Tx
				constructor: (_db) ->
					currentlyQueuedStatements = 0
					connectionClosed = false
					this.executeSql = (sql, bindings = [], callback, errorCallback, addReturning = true) ->
						if connectionClosed
							throw 'Trying to executeSQL on a closed connection'
						# We have queued a new statement so add it.
						currentlyQueuedStatements++
						thisTX = this
						sql = sql.replace(/GROUP BY NULL/g, '') # HACK: Remove GROUP BY NULL for MySQL? as it does not need/accept? it.
						sql = sql.replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT') # HACK: MySQL uses AUTO_INCREMENT rather than AUTOINCREMENT.
						sql = sql.replace(/DROP CONSTRAINT/g, 'DROP FOREIGN KEY') # HACK: MySQL uses FOREIGN KEY rather than CONSTRAINT.
						_db.query(sql, bindings, (err, res, fields) ->
							try
								if err?
									errorCallback?(thisTX, err)
									console.log(sql, bindings, err)
								else
									callback?(thisTX, result(res))
							finally
								# We have finished a statement so remove it.
								currentlyQueuedStatements--
								# Check if there are no queued statements after the callback has had a chance to remove them and close the connection if there are none queued.
								if currentlyQueuedStatements == 0
									connectionClosed = true
									_db.end()
						)
				begin: -> this.executeSql('START TRANSACTION;')
				end: -> this.executeSql('COMMIT;')
				rollback: -> this.executeSql('ROLLBACK;')
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' WHERE ' + extraWhereClause
					this.executeSql("SELECT name FROM (SELECT table_name as name FROM information_schema.tables WHERE table_schema = ?) t" + extraWhereClause + ";", [options.database], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> this.executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
			return {
				transaction: (callback, errorCallback) ->
					_db = mysql.createConnection(options)
					_db.query("SET sql_mode='ANSI_QUOTES';")
					callback(new Tx(_db))
			}
				
		exports.sqlite = (filepath) ->
			sqlite3 = requirejs('sqlite3').verbose();
			_db = new sqlite3.Database(filepath);
			result = (rows) ->
				return {
					rows: {
						length: rows?.length or 0
						item: (i) -> rows[i]
					}
				}
			tx = {
				executeSql: (sql, bindings, callback, errorCallback) ->
					thisTX = this
					_db.all sql, bindings ? [], (err, rows) ->
						if err?
							errorCallback? thisTX, err
							console.log(sql, err)
						else
							callback? thisTX, result(rows)
				begin: -> this.executeSql('BEGIN;')
				end: -> this.executeSql('END;')
				rollback: -> this.executeSql('ROLLBACK;')
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' AND ' + extraWhereClause
					this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_sequence')" + extraWhereClause + ";", [], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> this.executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
			}
			return {
				transaction: (callback) ->
					_db.serialize () ->
						callback(tx)
			}
	else
		exports.websql = (databaseName) ->
			_db = openDatabase(databaseName, "1.0", "rulemotion", 2 * 1024 * 1024)
			tx = (_tx) ->
				return {
					executeSql: (sql, bindings, callback, errorCallback) ->
						thisTX = this
						try
							# This is used so we can find the useful part of the stack trace, as WebSQL is asynchronous and starts a new stack.
							___STACK_TRACE___.please
						catch stackTrace
							null
							# Wrap the callbacks passed in with our own if necessary to pass in the wrapped tx.
							if callback?
								callback = do(callback) ->
									(_tx, _results) ->
										callback(thisTX, _results)
							errorCallback = do(errorCallback) ->
								(_tx, _err) ->
									console.log(sql, bindings, _err, stackTrace.stack)
									errorCallback?(thisTX, _err)
							_tx.executeSql(sql, bindings, callback, errorCallback)
					begin: ->
					end: ->
					# We need to use _tx here rather than this as it does not work when we use this
					# TODO: Investigate why it breaks with this
					rollback: -> _tx.executeSql("DROP TABLE '__Fo0oFoo'")
					tableList: (callback, errorCallback, extraWhereClause = '') ->
						if extraWhereClause != ''
							extraWhereClause = ' AND ' + extraWhereClause
						this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('__WebKitDatabaseInfoTable__', 'sqlite_sequence')" + extraWhereClause + ";", [], callback, errorCallback)
					dropTable: (tableName, ifExists = true, callback, errorCallback) -> this.executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
				}
			return {
				transaction: (callback) ->
					_db.transaction( (_tx) ->
						callback(tx(_tx))
					)
			}
	exports.connect = (databaseOptions) ->
		return exports[databaseOptions.engine](databaseOptions.params)

	return exports
)

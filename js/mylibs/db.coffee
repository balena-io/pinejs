define((requirejs, exports, module) ->
	if process?
		exports.postgres = (connectString) ->
			requirejs(["libs/inflection",
			"../ometa-js/lib",
			"../ometa-js/ometa-base"])
			requirejs(["mylibs/ometa-code/SQLBinds"])
			Client = new requirejs('pg').Client
			_db = new Client(connectString)
			_db.connect()
			result = (rows) ->
				return {
					rows:
						length: rows?.length or 0
						item: (i) -> rows[i]
					insertId: rows[0]?.id || null
				}
			tx = {
				executeSql: (sql, bindings = [], callback, errorCallback, addReturning = true) ->
					thisTX = this
					sql = sql.replace(/GROUP BY NULL/g, '') #HACK: Remove GROUP BY NULL for Postgres as it does not need/accept it.
					sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY') #HACK: Postgres uses SERIAL data type rather than auto increment
					if addReturning and /^\s*INSERT\s+INTO/i.test(sql)
						sql = sql.replace(/;?$/, ' RETURNING id;')
						console.log(sql)
					bindNo = 1
					sql = SQLBinds.matchAll(sql, "parse", [-> '$'+bindNo++])
					_db.query {text: sql, values: bindings}, (err, res) ->
						if err?
							errorCallback? thisTX, err
							console.log(sql, bindings, err)
						else
							callback? thisTX, result(res.rows)
				begin: -> this.executeSql('BEGIN;')
				end: -> this.executeSql('END;')
				rollback: -> this.executeSql('ROLLBACK;')
				tableList: (callback, errorCallback, extraWhereClause = '') ->
					if extraWhereClause != ''
						extraWhereClause = ' WHERE ' + extraWhereClause
					this.executeSql("SELECT * FROM (SELECT tablename as name FROM pg_tables WHERE schemaname = 'public' AND tablename != '_server_model_cache') t" + extraWhereClause + ";", [], callback, errorCallback)
				dropTable: (tableName, ifExists = true, callback, errorCallback) -> this.executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '" CASCADE;', [], callback, errorCallback)
			}
			return {
				transaction: (callback) ->
					callback(tx)
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
					this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_sequence', '_server_model_cache')" + extraWhereClause + ";", [], callback, errorCallback)
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
						#Wrap the callbacks passed in with our own if necessary to pass in the wrapped tx.
						if callback?
							callback = do(callback) ->
								(_tx, _results) ->
									callback(thisTX, _results)
						errorCallback = do(errorCallback) ->
							(_tx, _err) ->
								console.log(sql, _err)
								errorCallback?(thisTX, _err)
						_tx.executeSql(sql, bindings, callback, errorCallback)
					begin: ->
					end: ->
					# We need to use _tx here rather than this as it does not work when we use this
					#TODO: Investigate why it breaks with this
					rollback: -> _tx.executeSql("DROP TABLE '__Fo0oFoo'")
					tableList: (callback, errorCallback, extraWhereClause = '') ->
						if extraWhereClause != ''
							extraWhereClause = ' AND ' + extraWhereClause
						this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('__WebKitDatabaseInfoTable__', 'sqlite_sequence', '_server_model_cache')" + extraWhereClause + ";", [], callback, errorCallback)
					dropTable: (tableName, ifExists = true, callback, errorCallback) -> this.executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
				}
			return {
				transaction: (callback) ->
					_db.transaction( (_tx) ->
						callback(tx(_tx))
					)
			}
	return exports
)
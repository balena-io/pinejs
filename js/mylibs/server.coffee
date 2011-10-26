op = 
	eq: "="
	ne: "!="
	lk: "~"

if process?
	requirejs = require('requirejs');
	requirejs.config(
		nodeRequire: require
		baseUrl: 'js'
	)
	db = do () ->
		Client = new require('pg').Client
		_db = new Client(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres")
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
		
	# db = do () ->
		# sqlite3 = require('sqlite3').verbose();
		# _db = new sqlite3.Database('/tmp/rulemotion.db');
		# result = (rows) ->
			# return {
				# rows: {
					# length: rows?.length or 0
					# item: (i) -> rows[i]
				# }
			# }
		# tx = {
			# executeSql: (sql, bindings, callback, errorCallback) ->
				# thisTX = this
				# _db.all sql, bindings ? [], (err, rows) ->
					# if err?
						# errorCallback? thisTX, err
						# console.log(sql, err)
					# else
						# callback? thisTX, result(rows)
			# begin: -> this.executeSql('BEGIN;')
			# end: -> this.executeSql('END;')
			# rollback: -> this.executeSql('ROLLBACK;')
			# tableList: (callback, errorCallback, extraWhereClause = '') ->
				# if extraWhereClause != ''
					# extraWhereClause = ' AND ' + extraWhereClause
				# this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_sequence', '_server_model_cache')" + extraWhereClause + ";", [], callback, errorCallback)
			# dropTable: (tableName, ifExists = true, callback, errorCallback) -> this.executeSql('DROP TABLE ' + (if ifExists == true then 'IF EXISTS ' else '') + '"' + tableName + '";', [], callback, errorCallback)
		# }
		# return {
			# transaction: (callback) ->
				# _db.serialize () ->
					# callback(tx)
		# }
else
	requirejs = window.requirejs
	db = do () ->
		_db = openDatabase("rulemotion", "1.0", "rulemotion", 2 * 1024 * 1024)
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
requirejs(["libs/inflection",
		"../ometa-js/lib",
		"../ometa-js/ometa-base"])
requirejs([
	"mylibs/ometa-code/SBVRModels",
	"mylibs/ometa-code/SBVRParser",
	"mylibs/ometa-code/SBVR_PreProc",
	"mylibs/ometa-code/SBVR2SQL",
	"mylibs/ometa-code/ServerURIParser"]
)
if process?
	requirejs(["mylibs/ometa-code/SQLBinds"])


serverModelCache = do () ->
	#This is needed as the switch has no value on first execution. Maybe there's a better way?
	values = {
		serverOnAir: false
		modelAreaDisabled: false
		se:		""
		lastSE:	""
		lf:		[]
		prepLF:	[]
		sql:		[]
		trans:	[]
	}

	db.transaction (tx) ->
		tx.executeSql 'CREATE TABLE '+#Postgres does not support: IF NOT EXISTS
						'"_server_model_cache" (' +
					'"key"	VARCHAR PRIMARY KEY,' +
					'"value"	VARCHAR );'
		tx.executeSql 'SELECT * FROM "_server_model_cache";', [], (tx, result) ->
			for i in [0...result.rows.length]
				row = result.rows.item(i)
				values[row.key] = JSON.parse row.value;

	setValue = (key, value) ->
		values[key] = value
		db.transaction (tx) ->
			value = JSON.stringify(value).replace(/\\'/g,"\\\\'").replace(new RegExp("'",'g'),"\\'")
			tx.executeSql('SELECT 1 as count FROM "_server_model_cache" WHERE key = ?;', [key], (tx, result) ->
				if result.rows.length==0
					tx.executeSql 'INSERT INTO "_server_model_cache" VALUES (?, ?);', [key, value], null, null, false
				else
					tx.executeSql 'UPDATE "_server_model_cache" SET value = ? WHERE key = ?;', [value, key]
			)

	return {
		isServerOnAir: -> values.serverOnAir
		setServerOnAir: (bool) ->
			setValue 'serverOnAir', bool

		isModelAreaDisabled: -> values.modelAreaDisabled
		setModelAreaDisabled: (bool) ->
			setValue 'modelAreaDisabled', bool

		getSE: -> values.se
		setSE: (txtmod) ->
			setValue 'se', txtmod

		getLastSE: -> values.lastSE
		setLastSE: (txtmod) ->
			setValue 'lastSE', txtmod

		getLF: -> values.lf
		setLF: (lfmod) ->
			setValue 'lf', lfmod

		getPrepLF: -> values.prepLF
		setPrepLF: (prepmod) ->
			setValue 'prepLF', prepmod

		getSQL: -> values.sql
		setSQL: (sqlmod) ->
			setValue 'sql', sqlmod

		getTrans: -> values.trans
		setTrans: (trnmod) ->
			setValue 'trans', trnmod
	}

handlers =
	onair:
		GET: (successCallback, failureCallback) ->
			successCallback 200, serverModelCache.isServerOnAir()
	model:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getLastSE()
		]
	lfmodel:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getLF()
		]
	prepmodel:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getPrepLF()
		]
	sqlmodel:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getSQL()
		]
	update:
		POST: (successCallback, failureCallback) ->
			#update code will go here, based on executePOST
			failureCallback 404
	ui:
		GET: [
			[
				(tree) -> tree[1][1] == "textarea" and tree[1][3][1][1][3] == "model_area"
				(successCallback, failureCallback) ->
					successCallback 200, value: serverModelCache.getSE()
			]
			[
				(tree) -> tree[1][1] == "textarea-is_disabled" and tree[1][4][1][1][3] == "model_area"
				(successCallback, failureCallback) ->
					successCallback 200, value: serverModelCache.isModelAreaDisabled()
			]
		]
		PUT: [
			[
				(tree) -> tree[1][1] == "textarea" and tree[1][3][1][1][3] == "model_area"
				(successCallback, failureCallback, body) ->
					serverModelCache.setSE( JSON.parse(body).value )
					successCallback 200
			]
			[
				(tree) -> tree[1][1] == "textarea-is_disabled" and tree[1][4][1][1][3] == "model_area"
				(successCallback, failureCallback, body) ->
					serverModelCache.setModelAreaDisabled( JSON.parse(body).value )
					successCallback 200
			]
		]
	execute:
		POST: (successCallback, failureCallback) ->
			se = serverModelCache.getSE()
			try
				lfmod = SBVRParser.matchAll(se, "expr")
			catch e
				console.log 'Error parsing model', e
				failureCallback 404, 'Error parsing model'
				return null
			prepmod = SBVR_PreProc.match(lfmod, "optimizeTree")
			sqlmod = SBVR2SQL.match(prepmod, "trans")
			tree = SBVRParser.matchAll(modelT, "expr")
			tree = SBVR_PreProc.match(tree, "optimizeTree")
			trnmod = SBVR2SQL.match(tree, "trans")
			serverModelCache.setModelAreaDisabled true
			db.transaction (tx) ->
				tx.begin()
				executeSasync tx, sqlmod, ((tx, sqlmod, failureCallback, result) ->
					#TODO: fix this as soon as the successCallback mess is fixed
					executeTasync tx, trnmod, ((tx, trnmod, failureCallback, result) ->
						serverModelCache.setServerOnAir true
						serverModelCache.setLastSE se
						serverModelCache.setLF lfmod
						serverModelCache.setPrepLF prepmod
						serverModelCache.setSQL sqlmod
						serverModelCache.setTrans trnmod
						successCallback 200, result
					), failureCallback, result
				), ((errors) ->
					serverModelCache.setModelAreaDisabled false
					failureCallback 404, errors
				)
	cleardb:
		DELETE: (successCallback, failureCallback) ->
			db.transaction (tx) ->
				tx.tableList( (tx, result) ->
					for i in [0...result.rows.length]
						tx.dropTable(result.rows.item(i).name)
					successCallback(200)
				)
	importdb:
		# @param body The SQL queries to import.
		POST: (successCallback, failureCallback, body) ->
			queries = body.split(";")
			imported = 0
			db.transaction (tx) ->
				for query in queries when query.trim().length > 0
					do (query) ->
						tx.executeSql query, [], ((tx, result) ->
							console.log "Import Success", imported++
						), (tx, error) ->
							console.log query
							console.log error
			successCallback(200)

	exportdb:
		GET: (successCallback, failureCallback) ->
			if process?
				env = process.env
				env['PGPASSWORD'] = '.'
				require('child_process').exec('pg_dump --clean -U postgres -h localhost -p 5432', env: env, (error, stdout, stderr) ->
					console.log(stdout, stderr)
					successCallback(200, stdout)
				)
			else
				db.transaction (tx) ->
					tx.tableList(
						(tx, result) ->
							totalExports = result.rows.length + 1
							exportsProcessed = 0
							exported = ''
							for i in [0...result.rows.length]
								tbn = result.rows.item(i).name
								exported += 'DROP TABLE IF EXISTS "' + tbn + '";\n'
								exported += result.rows.item(i).sql + ";\n"
								do (tbn) ->
									db.transaction (tx) ->
										tx.executeSql 'SELECT * FROM "' + tbn + '";', [], ((tx, result) ->
											insQuery = ""
											for i in [0...result.rows.length]
												currRow = result.rows.item(i)
												notFirst = false
												insQuery += 'INSERT INTO "' + tbn + '" ('
												valQuery = ''
												for own propName of currRow
													if notFirst
														insQuery += ","
														valQuery += ","
													else
														notFirst = true
													insQuery += '"' + propName + '"'
													valQuery += "'" + currRow[propName] + "'"
												insQuery += ") values (" + valQuery + ");\n"
											exported += insQuery
											exportsProcessed++
											if exportsProcessed == totalExports
												successCallback(200, exported)
										)
							exportsProcessed++
							if exportsProcessed == totalExports
								successCallback(200, exported)
						null
						"name NOT LIKE '%_buk'"
					)
	backupdb:
		POST: (successCallback, failureCallback) ->
			db.transaction (tx) ->
				tx.tableList(
					(tx, result) ->
						for i in [0...result.rows.length]
							tbn = result.rows.item(i).name
							tx.dropTable(tbn + '_buk', true)
							tx.executeSql 'ALTER TABLE "' + tbn + '" RENAME TO "' + tbn + '_buk";'
					null
					"name NOT LIKE '%_buk'"
				)
			successCallback(200)
	restoredb:
		POST: (successCallback, failureCallback) ->
			db.transaction (tx) ->
				tx.tableList(
					(tx, result) ->
						for i in [0...result.rows.length]
							tbn = result.rows.item(i).name
							tx.dropTable(tbn[0...-4], true)
							tx.executeSql 'ALTER TABLE "' + tbn + '" RENAME TO "' + tbn[0...-4] + '";'
					null
					"name LIKE '%_buk'"
				)
			successCallback(200)


# successCallback = (statusCode, result, headers)
# failureCallback = (statusCode, errors, headers)
remoteServerRequest = (method, uri, headers, body, successCallback, failureCallback) ->
	if typeof successCallback != "function"
		successCallback = ->
	if typeof failureCallback != "function"
		failureCallback = ->

	tree = ServerURIParser.matchAll(uri, "uri")
	if headers? and headers["Content-Type"] == "application/xml"
			#TODO: in case of input: do something to make xml into a json object
			null
	execHandle = (handle) ->
		handle(successCallback, failureCallback, body)
	execFilterHandle = (filterHandle) ->
		if filterHandle[0](tree)
			execHandle(filterHandle[1])
			return true
		return false
	
	rootbranch = tree[0].toLowerCase()
	if handlers[rootbranch]?
		if handlers[rootbranch][method]?
			if typeof handlers[rootbranch][method] == 'function'
				execHandle(handlers[rootbranch][method])
			else
				if handlers[rootbranch][method].constructor.name == 'Array'
					if handlers[rootbranch][method][0].constructor.name == 'Array'
						for filterHandle in handlers[rootbranch][method]
							return if execFilterHandle(filterHandle)
					else if !execFilterHandle(handlers[rootbranch][method])
						failureCallback 404
				else
					throw new Exception('Incorrect handler setup: ', rootbranch, method)
		else
			failureCallback 404
		return
	switch rootbranch
		when "data"
			if serverModelCache.isServerOnAir()
				if tree[1] == undefined
					switch method
						when "GET"
							dataGET tree, headers, body, successCallback, failureCallback
						else
							failureCallback 404
				else if tree[1][1] == "transaction" and method == "GET"
					o = 
						id: tree[1][3][1][1][3]
						tcURI: "/transaction"
						lcURI: "/data/lock"
						tlcURI: "/data/lock-belongs_to-transaction"
						rcURI: "/data/resource"
						lrcURI: "/data/resource-is_under-lock"
						slcURI: "/data/lock-is_shared"
						xlcURI: "/data/lock-is_exclusive"
						ctURI: "/data/transaction*filt:transaction.id=" + tree[1][3][1][1][3] + "/execute"

					successCallback 200, o
				else
					switch method
						when "GET"
							#console.log "body:[" + body + "]"
							dataplusGET tree, headers, body, successCallback, failureCallback
						when "POST"
							dataplusPOST tree, headers, body, successCallback, failureCallback
						when "PUT"
							dataplusPUT tree, headers, body, successCallback, failureCallback
						when "DELETE"
							dataplusDELETE tree, headers, body, successCallback, failureCallback
						else
							failureCallback 404
		else
			if method == "DELETE"
				rootDELETE tree, headers, body, successCallback, failureCallback
			else
				failureCallback 404

dataplusDELETE = (tree, headers, body, successCallback, failureCallback) ->
	id = getID tree
	if id != 0
		if tree[1][1] == "lock" and hasCR tree
			#CR posted to Lock
			#insert delete entry
			db.transaction (tx) ->
				tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]
				tx.executeSql 'INSERT INTO "conditional_representation" ("lock_id","field_name","field_type","field_value")' +
							"VALUES (?,'__DELETE','','')", [id]
		else
			db.transaction ((tx) ->
				tx.executeSql 'SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], (tx, result) ->
					if result.rows.item(0).result in [1, true]
						tx.begin()
						tx.executeSql 'DELETE FROM "' + tree[1][1] + '" WHERE id = ?;', [id], (tx, result) ->
							validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
								tx.end()
								successCallback 200, result
							), failureCallback
					else
						failureCallback 404, [ "The resource is locked and cannot be deleted" ]
			), (err) ->


dataplusPUT = (tree, headers, body, successCallback, failureCallback) ->
	id = getID(tree)
	bd = JSON.parse(body)
	if tree[1][1] == "lock" and hasCR tree
		#CR posted to Lock
		db.transaction (tx) ->
			tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]

			sql = "INSERT INTO 'conditional_representation'" +
				"('lock_id','field_name','field_type','field_value')" +
				"VALUES (?, ?, ?, ?)"
			for pair in bd
				for own key, value of pair
					tx.executeSql(sql, [ id, key, typeof value, value ])
	else
		db.transaction ((tx) ->
			tx.executeSql 'SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], (tx, result) ->
				if result.rows.item(0).result in [1, true]
					if id != ""
						setStatements = []
						binds = []
						for pair in bd
							for own key, value of pair
								setStatements.push('"' + key + '"= ?')
								binds.push(value)
						binds.push(id)
						tx.begin()
						tx.executeSql 'UPDATE "' + tree[1][1] + '" SET ' + setStatements.join(", ") + " WHERE id = ?;", binds, (tx) ->
							validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
								tx.end()
								successCallback 200, result
							), failureCallback
				else
					failureCallback 404, [ "The resource is locked and cannot be edited" ]
		), (err) ->


dataplusPOST = (tree, headers, body, successCallback, failureCallback) ->
	#figure out if it's a POST to transaction/execute
	if tree[1][1] == "transaction" and isExecute tree
		id = getID tree

		#get all locks of transaction
		db.transaction ((tx) ->
			tx.executeSql 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id" = ?;', [id], (tx, locks) ->
				endLock tx, locks, 0, id, successCallback, failureCallback
		), (error) ->
			db.transaction (tx) ->
				tx.executeSql 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id" = ?;', [id], (tx, locks) ->
					#for each lock, do cleanup
					for i in [0...locks.rows.length]
						lock_id = locks.rows.item(i).lock_id
						tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id]
						tx.executeSql 'DELETE FROM "lock-is_exclusive" WHERE "lock_id" = ?;', [lock_id]
						tx.executeSql 'DELETE FROM "lock-is_shared" WHERE "lock_id" = ?;', [lock_id]
						tx.executeSql 'DELETE FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [lock_id]
						tx.executeSql 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id" = ?;', [lock_id]
						tx.executeSql 'DELETE FROM "lock" WHERE "id" = ?;', [lock_id]
					tx.executeSql 'DELETE FROM "transaction" WHERE "id" = ?;', [lock_id]
	else
		bd = JSON.parse(body)
		fields = []
		values = []
		binds = []
		for own i, pair of bd
			for own field, value of pair
				fields.push field
				values.push value
				binds.push '?'
		db.transaction (tx) ->
			tx.begin()
			sql = 'INSERT INTO "' + tree[1][1] + '" ("' + fields.join('","') + '") VALUES (' + binds.join(",") + ");"
			tx.executeSql sql, values, (tx, sqlResult) ->
				validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, headers, result) ->
					successCallback 201, result,
						location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + sqlResult.insertId
				), failureCallback


rootDELETE = (tree, headers, body, successCallback, failureCallback) ->
	#TODO: This should be reorganised to be properly async.
	db.transaction ((sqlmod) ->
		(tx) ->
			for row in sqlmod[1..] when row[0] in ["fcTp", "term"]
				tx.executeSql row[5]
	)(serverModelCache.getSQL())
	db.transaction ((trnmod) ->
		(tx) ->
			for row in trnmod[1..] when row[0] in ["fcTp", "term"]
				tx.executeSql row[5]
	)(serverModelCache.getTrans())
	#TODO: these two do not belong here
	serverModelCache.setSE ""
	serverModelCache.setModelAreaDisabled false

	serverModelCache.setLastSE ""
	serverModelCache.setPrepLF []
	serverModelCache.setLF []
	serverModelCache.setSQL []
	serverModelCache.setTrans []
	serverModelCache.setServerOnAir false

	successCallback 200


dataGET = (tree, headers, body, successCallback, failureCallback) ->
	result = 
		terms: []
		fcTps: []
	sqlmod = serverModelCache.getSQL()

	for row in sqlmod[1..]
		if row[0] == "term"
			result.terms.push 
				id: row[1]
				name: row[2]
		else if row[0] == "fcTp"
			result.fcTps.push 
				id: row[1]
				name: row[2]

	successCallback 200, result


dataplusGET = (tree, headers, body, successCallback, failureCallback) ->
	ftree = getFTree tree
	sql = ""
	if tree[1][0] == "term"
		sql = "SELECT * FROM " + tree[1][1]
		sql += " WHERE " unless ftree.length == 1
	else if tree[1][0] == "fcTp"
		ft = tree[1][1]
		fl = [ '"' + ft + '".id AS id' ]
		jn = []
		tb = [ '"' + ft + '"' ]

		for row in tree[1][2][1..]
			fl.push '"' + row + '" .id AS "' + row + '_id"'
			fl.push '"' + row + '".name AS "' + row + '_name"'
			tb.push '"' + row + '"'
			jn.push '"' + row + '".id = "' + ft + '"."' + row + '_id"'

		sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ")
		sql += " AND " unless ftree.length == 1
	if ftree.length != 1
		filts = []

		for row in ftree[1..]
			if row[0] == "filt"
				for row2 in row[1..]
					obj = ""
					obj = '"' + row2[1] + '".' if row2[1][0]?
					filts.push obj + '"' + row2[2] + '"' + op[row2[0]] + row2[3]
			else if row[0] == "sort"
				#process sort
				null
		sql += filts.join(" AND ")
	if sql != ""
		db.transaction (tx) ->
			tx.executeSql sql + ";", [], (tx, result) ->
				data = instances: result.rows.item(i) for i in [0...result.rows.length]
				successCallback 200, data


endLock = (tx, locks, i, trans_id, successCallback, failureCallback) ->
	#get conditional representations (if exist)
	lock_id = locks.rows.item(i).lock_id
	tx.executeSql 'SELECT * FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id], (tx, crs) ->
		#find which resource is under this lock
		tx.executeSql 'SELECT * FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [crs.rows.item(0).lock_id], (tx, locked) ->
			if crs.rows.item(0).field_name == "__DELETE"
				#delete said resource
				tx.executeSql 'DELETE FROM "' + locked.rows.item(0).resource_type + '" WHERE "id" = ?;', [locked.rows.item(0).resource_id], (tx, result) ->
					if i < locks.rows.length - 1
						endLock tx, locks, i + 1, trans_id, successCallback, failureCallback
					else
						#delete transaction
						tx.executeSql 'DELETE FROM "transaction" WHERE "id" = ?;', [trans_id]

						validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
							successCallback 200, result
						), failureCallback
			else
				#commit conditional_representation
				sql = 'UPDATE "' + locked.rows.item(0).resource_type + '" SET '

				for j in [0...crs.rows.length]
					item = crs.rows.item(j);
					sql += '"' + item.field_name + '"='
					if item.field_type == "string"
						sql += '"' + item.field_value + '"'
					else
						sql += item.field_value
					sql += ", " if j < crs.rows.length - 1
				sql += ' WHERE "id"=' + locked.rows.item(0).resource_id + ';'
				tx.executeSql sql, [], (tx, result) ->
					if i < locks.rows.length - 1
						endLock tx, locks, i + 1, trans_id, successCallback, failureCallback
					else
						tx.executeSql 'DELETE FROM "transaction" WHERE "id" = ?;', [trans_id]

						validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
							successCallback 200, result
						), failureCallback
			tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [crs.rows.item(0).lock_id]
			tx.executeSql 'DELETE FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [crs.rows.item(0).lock_id]

	tx.executeSql 'DELETE FROM "lock-is_shared" WHERE "lock_id" = ?;', [lock_id]
	tx.executeSql 'DELETE FROM "lock-is_exclusive" WHERE "lock_id" = ?;', [lock_id]
	tx.executeSql 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id" = ?;', [lock_id]
	tx.executeSql 'DELETE FROM "lock" WHERE "id" = ?;', [lock_id]

# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
validateDB = (tx, sqlmod, successCallback, failureCallback) ->
	errors = []
	totalQueries = 0
	totalExecuted = 0

	for row in sqlmod when row[0] == "rule"
		totalQueries++
		tx.executeSql row[4], [], do(row) ->
			(tx, result) ->
				totalExecuted++
				if result.rows.item(0).result in [false, 0]
					errors.push row[2]
				
				if totalQueries == totalExecuted
					if errors.length > 0
						tx.rollback()
						failureCallback 404, errors
					else
						tx.end()
						successCallback tx, sqlmod, failureCallback, result
	if totalQueries == 0
		successCallback tx, sqlmod, failureCallback, ""


# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
executeSasync = (tx, sqlmod, successCallback, failureCallback, result) ->
	#Create tables related to terms and fact types
	for row in sqlmod when row[0] in ["fcTp", "term"]
		tx.executeSql row[4]

	#Validate the [empty] model according to the rules. 
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	validateDB tx, sqlmod, successCallback, failureCallback


# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
executeTasync = (tx, trnmod, successCallback, failureCallback, result) ->
	#Execute transaction model.
	executeSasync tx, trnmod, ((tx, trnmod, failureCallback, result) ->
		#Hack: Add certain attributes to the transaction model tables. 
		#This should eventually be done with SBVR, when we add attributes.
		tx.executeSql 'ALTER TABLE "resource-is_under-lock" ADD COLUMN resource_type TEXT'
		tx.executeSql 'ALTER TABLE "resource-is_under-lock" DROP CONSTRAINT "resource-is_under-lock_resource_id_fkey";'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_name TEXT'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_value TEXT'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_type TEXT'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN lock_id TEXT'
		successCallback tx, trnmod, failureCallback, result
	), ((errors) ->
		serverModelCache.setModelAreaDisabled false
		failureCallback 404, errors
	), result


updateRules = (sqlmod) ->
	#Create tables related to terms and fact types
	#if not exists clause makes sure table is not double-created,
	#tho this should be dealt with more elegantly.
	for row in sqlmod when row[0] in ["fcTp", "term"]
		tx.executeSql row[4]

	#Validate the [empty] model according to the rules. 
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	for row in sqlmod when row[0] == "rule"
		query = row[4]
		l[++m] = row[2]
		tx.executeSql query, [], (tx, result) ->
			if result.rows.item(0).result in [0, false]
				alert "Error: " + l[++k]
		

getFTree = (tree) ->
	if tree[1][0] == "term"
		return tree[1][3]
	else if tree[1][0] == "fcTp"
		return tree[1][4]
	return []

getID = (tree) ->
	if tree[1][0] == "term"
		id = tree[1][2]
	else if tree[1][0] == "fcTp"
		id = tree[1][3]
	id = 0 if id == ""
	#if the id is empty, search the filters for one
	if id is 0
		ftree = getFTree tree
		for f in ftree[1..] when f[0] == "filt" and
							f[1][0] == "eq" and f[1][2] == "id"
			return f[1][3]
	return id

hasCR = (tree) ->
	#figure out if this is a CR posted to a Lock
	for f in getFTree(tree) when f[0] == "cr"
		return true
	return false

isExecute = (tree) ->
	for f in getFTree(tree) when f[0] == "execute"
		return true
	return false

if process?
	staticServer = new(require('node-static').Server)('./');
	http = require('http')
	http.createServer((request, response) ->
		console.log("Request received")
		body = ''
		request.on('data', (chunk) ->
			body += chunk
			#console.log('Chunk', chunk)
		)
		request.on('end', () ->
			console.log('End', request.method, request.url)#, body)
			nodePath = '/node'
			if nodePath == request.url[0...nodePath.length]
				console.log('Node')
				remoteServerRequest(request.method, request.url[nodePath.length..], request.headers, body,
					(statusCode, result = "", headers) ->
						console.log('Success')#, result)
						response.writeHead(statusCode, headers)
						response.end(JSON.stringify(result))
					(statusCode, errors, headers) ->
						console.log('Error', errors, new Error().stack)
						response.writeHead(statusCode, headers)
						response.end(JSON.stringify(errors))
				)
			else
				console.log('Static')
				staticServer.serve(request, response)
				
		)
	).listen(process.env.PORT or 1337, () ->
		console.log('Server started')
	)


window?.remoteServerRequest = remoteServerRequest

# fs = require('fs')
# lazy = require("lazy");
# imported = 0
# new lazy(fs.createReadStream(process.argv[2])).lines.forEach((query) ->
	# query = query.toString().trim();
	# if query.length > 0
		# _db.run query, (error) ->
			# if error
				# console.log error, imported++
			# else
				# console.log "Import Success", imported++
# )

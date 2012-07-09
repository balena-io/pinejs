define(['sbvr-parser/SBVRParser', 'sbvr-compiler/LF2AbstractSQLPrep', 'sbvr-compiler/LF2AbstractSQL', 'sbvr-compiler/AbstractSQL2SQL', 'data-server/ServerURIParser'], (SBVRParser, LF2AbstractSQLPrep, LF2AbstractSQL, AbstractSQL2SQL, ServerURIParser) ->
	exports = {}
	db = null
	transactionModel = null
	op =
		eq: "="
		ne: "!="
		lk: "~"
	
	createAsyncQueueCallback = (successCallback, errorCallback, successCollectFunc = ((arg) -> return arg), errorCollectFunc = ((arg) -> return arg)) ->
		totalQueries = 0
		queriesFinished = 0
		endedAdding = false
		error = false
		results = []
		errors = []
		checkFinished = () ->
			if(endedAdding && queriesFinished == totalQueries)
				if(error)
					errorCallback(errors)
				else
					successCallback(results)
		return {
			addWork: (amount = 1) ->
				if(endedAdding)
					throw 'You cannot add after ending adding'
				totalQueries += amount
			endAdding: () ->
				if(endedAdding)
					throw 'You cannot end adding twice'
				endedAdding = true
				checkFinished()
			successCallback: () ->
				if(successCollectFunc?)
					results.push(successCollectFunc.apply(null, arguments))
				queriesFinished++
				checkFinished()
			errorCallback: () ->
				if(errorCollectFunc?)
					errors.push(errorCollectFunc.apply(null, arguments))
				error = true
				queriesFinished++
				checkFinished()
		}
	
	rebuildFactType = (factType) ->
		factType = factType.split('-')
		for factTypePart, key in factType
			factTypePart = factTypePart.replace(/_/g, ' ')
			if key % 2 == 0
				factType[key] = ['Term', factTypePart]
			else
				factType[key] = ['Verb', factTypePart]
		return factType
					
	getCorrectTableInfo = (oldTableName) ->
		getAttributeInfo = (sqlmod) ->
			switch sqlmod.tables[factType]
				when 'BooleanAttribute'
					isAttribute = {termName: factType[0][1], attributeName: factType[1][1]}
					table = sqlmod.tables[isAttribute.termName]
				when 'Attribute'
					isAttribute = {termName: factType[0][1], attributeName: sqlmod.tables[factType[2][1]].name}
					table = sqlmod.tables[isAttribute.termName]
				else
					table = sqlmod.tables[factType]
			return {table, isAttribute}
			
		sqlmod = serverModelCache.getSQL()
		factType = rebuildFactType(oldTableName)
		if sqlmod.tables.hasOwnProperty(factType)
			return getAttributeInfo(sqlmod)
		# Transaction model..
		else if transactionModel.tables.hasOwnProperty(factType)
			return getAttributeInfo(transactionModel)
		else if sqlmod.tables.hasOwnProperty(oldTableName)
			return {table: sqlmod.tables[oldTableName], isAttribute: false}
		else # Transaction model..
			return {table: transactionModel.tables[oldTableName], isAttribute: false}

	# serverModelCache needs to be called after 'db' has been assigned in order to set itself up. 
	serverModelCache = () ->
		# This is needed as the switch has no value on first execution. Maybe there's a better way?
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
		
		pendingCallbacks = []

		setValue = (key, value) ->
			values[key] = value
			db.transaction (tx) ->
				value = JSON.stringify(value)
				tx.executeSql('SELECT 1 FROM "_server_model_cache" WHERE "key" = ?;', [key], (tx, result) ->
					if result.rows.length==0
						tx.executeSql 'INSERT INTO "_server_model_cache" VALUES (?, ?);', [key, value], null, null, false
					else
						tx.executeSql 'UPDATE "_server_model_cache" SET value = ? WHERE "key" = ?;', [value, key]
				)

		serverModelCache = {
			whenLoaded: (func) -> pendingCallbacks.push(func)
		
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

		db.transaction (tx) ->
			tx.executeSql 'CREATE TABLE ' + # Postgres does not support: IF NOT EXISTS
							'"_server_model_cache" (' +
							'"key"		VARCHAR(40) PRIMARY KEY,' +
							'"value"	VARCHAR(32768) );'
			tx.executeSql 'SELECT * FROM "_server_model_cache";', [], (tx, result) ->
				for i in [0...result.rows.length]
					row = result.rows.item(i)
					values[row.key] = JSON.parse row.value

				serverModelCache.whenLoaded = (func) -> func()
				for callback in pendingCallbacks
					callback()



	endLock = (tx, locks, i, trans_id, successCallback, failureCallback) ->
		continueEndingLock = (tx) ->
			if i < locks.rows.length - 1
				endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback)
			else
				tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [trans_id],
					(tx, result) ->
						validateDB(tx, serverModelCache.getSQL(), successCallback, failureCallback)
					(tx, error) ->
						failureCallback(tx, [error])
				)

		# get conditional representations (if exist)
		lock_id = locks.rows.item(i).lock
		tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], (tx, crs) ->
			# find which resource is under this lock
			tx.executeSql('SELECT * FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id], (tx, locked) ->
				{table, isAttribute} = getCorrectTableInfo(locked.rows.item(0).resource_type)
				asyncCallback = createAsyncQueueCallback(
					() ->
						continueEndingLock(tx)
					(errors) ->
						failureCallback(tx, errors)
				)
				if crs.rows.item(0).field_name == "__DELETE"
					# delete said resource
					if isAttribute
						sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 0 WHERE "' + table.idField + '" = ?;'
					else
						sql = 'DELETE FROM "' + table.name + '" WHERE "' + table.idField + '" = ?;'
				else
					# commit conditional_representation
					sql = 'UPDATE "' + table.name + '" SET '

					for j in [0...crs.rows.length]
						item = crs.rows.item(j)
						sql += '"' + item.field_name + '"='
						if item.field_type == "string"
							sql += '"' + item.field_value + '"'
						else
							sql += item.field_value
						sql += ", " if j < crs.rows.length - 1
					sql += ' WHERE "' + table.idField + '" = ? ;'
				asyncCallback.addWork(3)
				tx.executeSql(sql, [locked.rows.item(0).resource], asyncCallback.successCallback, asyncCallback.errorCallback)
				tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], asyncCallback.successCallback, asyncCallback.errorCallback)
				tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id], asyncCallback.successCallback, asyncCallback.errorCallback)
				asyncCallback.endAdding()
			)
		)

		tx.executeSql 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock" = ?;', [lock_id]
		tx.executeSql 'DELETE FROM "lock" WHERE "id" = ?;', [lock_id]

	# successCallback = (tx, sqlmod, failureCallback, result)
	# failureCallback = (tx, errors)
	validateDB = (tx, sqlmod, successCallback, failureCallback) ->
		asyncCallback = createAsyncQueueCallback(
			() ->
				tx.end()
				successCallback(tx)
			(errors) ->
				tx.rollback()
				failureCallback(tx, errors)
		)

		asyncCallback.addWork(sqlmod.rules.length)
		for rule in sqlmod.rules
			tx.executeSql(rule.sql, [], do(rule) ->
				(tx, result) ->
					if result.rows.item(0).result in [false, 0]
						asyncCallback.errorCallback(rule.structuredEnglish)
					else
						asyncCallback.successCallback()
			)
		asyncCallback.endAdding()

	# successCallback = (tx, sqlmod, failureCallback)
	# failureCallback = (tx, errors)
	executeSasync = (tx, sqlmod, successCallback, failureCallback) ->
		# Create tables related to terms and fact types
		for createStatement in sqlmod.createSchema
			tx.executeSql(createStatement)

		# Validate the [empty] model according to the rules.
		# This may eventually lead to entering obligatory data.
		# For the moment it blocks such models from execution.
		validateDB(tx, sqlmod, successCallback, failureCallback)


	# successCallback = (tx, sqlmod, failureCallback)
	# failureCallback = (tx, errors)
	executeTasync = (tx, trnmod, successCallback, failureCallback) ->
		# Execute transaction model.
		executeSasync(tx, trnmod, (tx) ->
			# Hack: Add certain attributes to the transaction model tables.
			# This should eventually be done with SBVR, when we add attributes.
			tx.executeSql 'ALTER TABLE "resource-is_under-lock" DROP CONSTRAINT "resource-is_under-lock_resource_id_fkey";'
			successCallback tx
		, (tx, errors) ->
			serverModelCache.setModelAreaDisabled false
			failureCallback(errors)
		)


	updateRules = (sqlmod) ->
		# Create tables related to terms and fact types
		# if not exists clause makes sure table is not double-created,
		# though this should be dealt with more elegantly.
		for createStatement in sqlmod.createSchema
			tx.executeSql(createStatement)

		# Validate the [empty] model according to the rules.
		# This may eventually lead to entering obligatory data.
		# For the moment it blocks such models from execution.
		for rule in sqlmod.rules
			l[++m] = rule.structuredEnglish
			tx.executeSql(rule.sql, [], (tx, result) ->
				if result.rows.item(0).result in [0, false]
					alert "Error: " + l[++k]
			)

	getFTree = (tree) ->
		if tree[1][0] == "Term"
			return tree[1][3]
		else if tree[1][0] == "FactType"
			return tree[1][4]
		return []

	getID = (tree) ->
		if tree[1][0] == "Term"
			id = tree[1][2]
		else if tree[1][0] == "FactType"
			id = tree[1][3]
		id = 0 if id == ""
		# if the id is empty, search the filters for one
		if id is 0
			ftree = getFTree tree
			for f in ftree[1..] when f[0] == "filt" and
								f[1][0] == "eq" and f[1][2] == "id"
				return f[1][3]
		return id

	hasCR = (tree) ->
		# figure out if this is a CR posted to a Lock
		for f in getFTree(tree) when f[0] == "cr"
			return true
		return false

	isExecute = (tree) ->
		for f in getFTree(tree) when f[0] == "execute"
			return true
		return false

	# Middleware
	serverIsOnAir = (req, res, next) ->
		serverModelCache.whenLoaded( () ->
			if serverModelCache.isServerOnAir()
				next()
			else
				next('route')
		)

	parseURITree = (req, res, next) ->
		if !req.tree?
			try
				req.tree = ServerURIParser.matchAll(req.url, "uri")
			catch e
				req.tree = false
		if req.tree == false
			next('route')
		else
			next()

	# Setup function
	exports.setup = (app, requirejs) ->

		requirejs(['database-layer/db'], (dbModule) ->
			if process?
				db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres")
				AbstractSQL2SQL = AbstractSQL2SQL.postgres
				# db = dbModule.mysql({user: 'root', password: '.', database: 'rulemotion'})
				# db = dbModule.sqlite('/tmp/rulemotion.db')
			else
				db = dbModule.websql('rulemotion')
				AbstractSQL2SQL = AbstractSQL2SQL.websql
			
			serverModelCache()
			transactionModel = '''
					Term:      Integer
					Term:      Long Text
					Term:      resource type
						Concept type: Long Text
					Term:      field name
						Concept type: Long Text
					Term:      field value
						Concept type: Long Text
					Term:      field type
						Concept type: Long Text
					Term:      resource
					Term:      transaction
					Term:      lock
					Term:      conditional representation
						Database Value Field: lock
					Fact type: lock is exclusive
					Fact type: lock is shared
					Fact type: resource is under lock
						Term Form: locked resource
					Fact type: locked resource has resource type
					Fact type: lock belongs to transaction
					Fact type: conditional representation has field name
					Fact type: conditional representation has field value
					Fact type: conditional representation has field type
					Fact type: conditional representation has lock
					Rule:      It is obligatory that each locked resource has exactly 1 resource type
					Rule:      It is obligatory that each conditional representation has exactly 1 field name
					Rule:      It is obligatory that each conditional representation has exactly 1 field value
					Rule:      It is obligatory that each conditional representation has exactly 1 field type
					Rule:      It is obligatory that each conditional representation has exactly 1 lock
					Rule:      It is obligatory that each resource is under at most 1 lock that is exclusive'''
			transactionModel = SBVRParser.matchAll(transactionModel, "expr")
			transactionModel = LF2AbstractSQLPrep.match(transactionModel, "Process")
			transactionModel = LF2AbstractSQL.match(transactionModel, "Process")
			transactionModel = AbstractSQL2SQL(transactionModel)
		)

		app.get('/onair',						(req, res, next) -> res.json(serverModelCache.isServerOnAir()))
		app.get('/model',		serverIsOnAir,	(req, res, next) -> res.json(serverModelCache.getLastSE()))
		app.get('/lfmodel',		serverIsOnAir,	(req, res, next) -> res.json(serverModelCache.getLF()))
		app.get('/prepmodel',	serverIsOnAir,	(req, res, next) -> res.json(serverModelCache.getPrepLF()))
		app.get('/sqlmodel',	serverIsOnAir,	(req, res, next) -> res.json(serverModelCache.getSQL()))
		app.post('/update',		serverIsOnAir,	(req, res, next) -> res.send(404))
		app.post('/execute',					(req, res, next) ->
			se = serverModelCache.getSE()
			try
				lfmod = SBVRParser.matchAll(se, "expr")
			catch e
				console.log('Error parsing model', e)
				res.json('Error parsing model', 404)
				return null
			prepmod = LF2AbstractSQL.match(LF2AbstractSQLPrep.match(lfmod, "Process"), "Process")
			sqlmod = AbstractSQL2SQL(prepmod, "trans")
			
			db.transaction((tx) ->
				tx.begin()
				executeSasync(tx, sqlmod, (tx) ->
					# TODO: fix this as soon as the successCallback mess is fixed
					executeTasync(tx, transactionModel, (tx) ->
						serverModelCache.setModelAreaDisabled(true)
						serverModelCache.setServerOnAir true
						serverModelCache.setLastSE se
						serverModelCache.setLF lfmod
						serverModelCache.setPrepLF prepmod
						serverModelCache.setSQL sqlmod
						serverModelCache.setTrans transactionModel
						res.send(200)
					, (tx, errors) ->
						res.json(errors, 404)
					)
				, (tx, errors) ->
					res.json(errors, 404)
				)
			)
		)
		app.del('/cleardb', (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList( (tx, result) ->
					for i in [0...result.rows.length]
						tx.dropTable(result.rows.item(i).name)
					res.send(200)
				)
		)
		app.put('/importdb', (req, res, next) ->
			queries = req.body.split(";")
			asyncCallback = createAsyncQueueCallback(
				() -> res.send(200)
				() -> res.send(404)
			)
			db.transaction (tx) ->
				for query in queries when query.trim().length > 0
					do (query) ->
						asyncCallback.addWork()
						tx.executeSql query, [], asyncCallback.successCallback, (tx, error) ->
							console.log(query)
							console.log(error)
							asyncCallback.errorCallback
				asyncCallback.endAdding()
		)
		app.get('/exportdb', (req, res, next) ->
			if process?
				env = process.env
				env['PGPASSWORD'] = '.'
				req = require
				req('child_process').exec('pg_dump --clean -U postgres -h localhost -p 5432', env: env, (error, stdout, stderr) ->
					console.log(stdout, stderr)
					res.json(stdout)
				)
			else
				db.transaction (tx) ->
					tx.tableList(
						(tx, result) ->
							exported = ''
							asyncCallback = createAsyncQueueCallback(
								() -> res.json(exported)
								() -> res.send(404)
							)
							asyncCallback.addWork(result.rows.length)
							for i in [0...result.rows.length]
								tbn = result.rows.item(i).name
								exported += 'DROP TABLE IF EXISTS "' + tbn + '";\n'
								exported += result.rows.item(i).sql + ";\n"
								do (tbn) ->
									db.transaction (tx) ->
										tx.executeSql('SELECT * FROM "' + tbn + '";', [], 
											(tx, result) ->
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
												asyncCallback.successCallback()
											asyncCallback.errorCallback
										)
							asyncCallback.endAdding()
						null
						"name NOT LIKE '%_buk'"
					)
		)
		app.post('/backupdb', serverIsOnAir, (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList(
					(tx, result) ->
						asyncCallback = createAsyncQueueCallback(
							() -> res.send(200)
							() -> res.send(404)
						)
						asyncCallback.addWork(result.rows.length * 2)
						for i in [0...result.rows.length]
							tbn = result.rows.item(i).name
							tx.dropTable(tbn + '_buk', true, asyncCallback.successCallback, asyncCallback.errorCallback)
							tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn + '_buk";', asyncCallback.successCallback, asyncCallback.errorCallback)
					() -> res.send(404)
					"name NOT LIKE '%_buk'"
				)
		)
		app.post('/restoredb', serverIsOnAir, (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList(
					(tx, result) ->
						asyncCallback = createAsyncQueueCallback(
							() -> res.send(200)
							() -> res.send(404)
						)
						asyncCallback.addWork(result.rows.length * 2)
						for i in [0...result.rows.length]
							tbn = result.rows.item(i).name
							tx.dropTable(tbn[0...-4], true, asyncCallback.successCallback, asyncCallback.errorCallback)
							tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn[0...-4] + '";', asyncCallback.successCallback, asyncCallback.errorCallback)
					() -> res.send(404)
					"name LIKE '%_buk'"
				)
		)
		app.get('/ui/*', parseURITree, (req, res, next) ->
			if req.tree[1][1] == "textarea" and req.tree[1][3][1][1][3] == "model_area"
				res.json(value: serverModelCache.getSE())
			else if req.tree[1][1] == "textarea-is_disabled" and req.tree[1][4][1][1][3] == "model_area"
				res.json(value: serverModelCache.isModelAreaDisabled())
			else
				res.send(404)
		)
		app.put('/ui/*', parseURITree, (req, res, next) ->
			if req.tree[1][1] == "textarea" and req.tree[1][3][1][1][3] == "model_area"
				serverModelCache.setSE( req.body.value )
				res.send(200)
			else if req.tree[1][1] == "textarea-is_disabled" and req.tree[1][4][1][1][3] == "model_area"
				serverModelCache.setModelAreaDisabled( req.body.value )
				res.send(200)
			else
				res.send(404)
		)

		app.get('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			tree = req.tree
			if tree[1] == undefined
				result =
					terms: []
					factTypes: []
				sqlmod = serverModelCache.getSQL()
				for key, row of sqlmod.tables
					if /Term,.*Verb,/.test(key)
						result.factTypes.push(
							id: row.name
							name: row.name
						)
					else
						result.terms.push(
							id: row.name
							name: row.name
						)

				res.json(result)
			else if tree[1][1] == "transaction"
				res.json(
					id: tree[1][3][1][1][3]
					tcURI: "/transaction"
					lcURI: "/data/lock"
					tlcURI: "/data/lock-belongs_to-transaction"
					rcURI: "/data/resource"
					lrcURI: "/data/resource-is_under-lock"
					slcURI: "/data/lock-is_shared"
					xlcURI: "/data/lock-is_exclusive"
					ctURI: "/data/transaction*filt:transaction.id=" + tree[1][3][1][1][3] + "/execute"
				)
			else
				ftree = getFTree(tree)
				sql = ""
				{table, isAttribute} = getCorrectTableInfo(tree[1][1])
				if tree[1][0] == "Term"
					sql = 'SELECT * FROM "' + table.name + '"'
					if ftree.length != 1
						sql += " WHERE "
				else if tree[1][0] == "FactType"
					factType = tree[1][1]
					if isAttribute
						sql = 'SELECT id, value AS "' + isAttribute.termName + '_value", "' + isAttribute.attributeName + '" ' +
								'FROM "' + table.name + '" ' +
								'WHERE "' + isAttribute.attributeName + '" = 1'
					else
						fields = [ '"' + factType + '".id AS id' ]
						joins = []
						tables = [ '"' + factType + '"' ]

						for row in tree[1][2][1..]
							fields.push '"' + row + '".id AS "' + row + '_id"'
							fields.push '"' + row + '"."value" AS "' + row + '_value"'
							tables.push '"' + row + '"'
							joins.push '"' + row + '".id = "' + factType + '"."' + row + '"'

						sql = "SELECT " + fields.join(", ") + " FROM " + tables.join(", ") + " WHERE " + joins.join(" AND ")
						if ftree.length != 1
							sql += " AND "
				if ftree.length != 1
					filts = []

					for row in ftree[1..]
						if row[0] == "filt"
							for row2 in row[1..]
								obj = ""
								if row2[1][0]?
									{table} = getCorrectTableInfo(row2[1])
									obj = '"' + table.name + '".' 
								filts.push obj + '"' + row2[2] + '"' + op[row2[0]] + row2[3]
						else if row[0] == "sort"
							# process sort
							null
					sql += filts.join(" AND ")
				if sql != ""
					db.transaction (tx) ->
						tx.executeSql sql + ";", [], (tx, result) ->
							data = instances: (result.rows.item(i) for i in [0...result.rows.length])
							res.json(data)
				else
					res.send(404)

		)

		app.post('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			if req.tree[1] == undefined
				res.send(404)
			else
				tree = req.tree
				# figure out if it's a POST to transaction/execute
				if tree[1][1] == "transaction" and isExecute(tree)
					id = getID(tree)

					# get all locks of transaction
					db.transaction ((tx) ->
						tx.executeSql('SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction" = ?;', [id], (tx, locks) ->
							endLock(tx, locks, 0, id, (tx) ->
								res.send(200)
							, (tx, errors) ->
								res.json(errors, 404)
							)
						)
					)
				else
					fields = []
					values = []
					binds = []
					for own i, pair of req.body
						for own field, value of pair
							fields.push field
							values.push value
							binds.push '?'
					
					{table, isAttribute} = getCorrectTableInfo(tree[1][1])
					if isAttribute
						sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 1 WHERE "' + table.idField + '" = ?;'
					else
						sql = 'INSERT INTO "' + table.name + '" ("' + fields.join('","') + '") VALUES (' + binds.join(",") + ');'
					
					db.transaction( (tx) ->
						tx.begin()
						tx.executeSql(sql, values, (tx, sqlResult) ->
							validateDB(tx, serverModelCache.getSQL(), (tx) ->
								res.send(201,
									location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + if isAttribute then values[0] else sqlResult.insertId
								)
							, (tx, errors) ->
								res.json(errors, 404)
							)
						)
					)
		)

		app.put('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			if req.tree[1] == undefined
				res.send(404)
			else
				tree = req.tree
				id = getID(tree)
				if tree[1][1] == "lock" and hasCR(tree)
					# CR posted to Lock
					db.transaction (tx) ->
						tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [id], (tx, result) ->
							asyncCallback = createAsyncQueueCallback(
								() ->
									res.send(200)
								() ->
									res.send(404)
							)
							sql = 'INSERT INTO "conditional_representation"' +
								'("lock","field_name","field_type","field_value")' +
								"VALUES (?, ?, ?, ?)"
							for pair in req.body
								for own key, value of pair
									asyncCallback.addWork()
									tx.executeSql(sql, [ id, key, typeof value, value ], asyncCallback.successCallback, asyncCallback.errorCallback)
							asyncCallback.endAdding()
						)
				else
					db.transaction ((tx) ->
						tx.executeSql 'SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource" = ?) AS result;', [tree[1][1], id], (tx, result) ->
							if result.rows.item(0).result in [1, true]
								if id != ""
									setStatements = []
									binds = []
									for pair in req.body
										for own key, value of pair
											setStatements.push('"' + key + '"= ?')
											binds.push(value)
									binds.push(id)
									tx.begin()
									tx.executeSql('UPDATE "' + tree[1][1] + '" SET ' + setStatements.join(", ") + " WHERE id = ?;", binds, (tx) ->
										validateDB(tx, serverModelCache.getSQL(), (tx) ->
											tx.end()
											res.send(200)
										, (tx, errors) ->
											res.json(errors, 404)
										)
									)
							else
								res.json([ "The resource is locked and cannot be edited" ], 404)
					)
		)

		app.del('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			tree = req.tree
			if tree[1] == undefined
				res.send(404)
			else
				id = getID(tree)
				if id != 0
					if tree[1][1] == "lock" and hasCR(tree)
						# CR posted to Lock
						# insert delete entry
						db.transaction (tx) ->
							asyncCallback = createAsyncQueueCallback(
								() ->
									res.send(200)
								() ->
									res.send(404)
							)
							asyncCallback.addWork(2)
							tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [id], asyncCallback.successCallback, asyncCallback.errorCallback)
							tx.executeSql('INSERT INTO "conditional_representation" ("lock","field_name","field_type","field_value")' +
										"VALUES (?,'__DELETE','','')", [id], asyncCallback.successCallback, asyncCallback.errorCallback)
							asyncCallback.endAdding()
					else
						db.transaction ((tx) ->
							tx.executeSql('SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource" = ?) AS result;', [tree[1][1], id], (tx, result) ->
								if result.rows.item(0).result in [1, true]
									tx.begin()
									{table, isAttribute} = getCorrectTableInfo(tree[1][1])
									if isAttribute
										sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 0 WHERE "' + table.idField + '" = ?;'
									else
										sql = 'DELETE FROM "' + table.name + '" WHERE "' + table.idField + '" = ?;'
									
									tx.executeSql(sql, [id], (tx, result) ->
										validateDB(tx, serverModelCache.getSQL(), (tx) ->
											tx.end()
											res.send(200)
										, (tx, errors) ->
											res.json(errors, 404)
										)
									)
								else
									res.json([ "The resource is locked and cannot be deleted" ], 404)
							)
						)
		)

		app.del('/', serverIsOnAir, (req, res, next) ->
			# TODO: This should be reorganised to be properly async.
			db.transaction ((sqlmod) ->
				(tx) ->
					for dropStatement in sqlmod.dropSchema
						tx.executeSql(dropStatement)
			)(serverModelCache.getSQL())
			db.transaction ((trnmod) ->
				(tx) ->
					for dropStatement in trnmod.dropSchema
						tx.executeSql(dropStatement)
			)(serverModelCache.getTrans())
			# TODO: these two do not belong here
			serverModelCache.setSE ""
			serverModelCache.setModelAreaDisabled false

			serverModelCache.setLastSE ""
			serverModelCache.setPrepLF []
			serverModelCache.setLF []
			serverModelCache.setSQL []
			serverModelCache.setTrans []
			serverModelCache.setServerOnAir false

			res.send(200)
		)
	return exports
)
define(['sbvr-parser/SBVRParser', 'sbvr-compiler/LF2AbstractSQLPrep', 'sbvr-compiler/LF2AbstractSQL', 'sbvr-compiler/AbstractSQL2SQL', 'data-server/ServerURIParser'], (SBVRParser, LF2AbstractSQLPrep, LF2AbstractSQL, AbstractSQL2SQL, ServerURIParser) ->
	exports = {}
	db = null
	transactionModel = null
	op =
		eq: "="
		ne: "!="
		lk: "~"
	
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
		continueEndingLock = (tx, result) ->
			if i < locks.rows.length - 1
				endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback)
			else
				tx.executeSql 'DELETE FROM "transaction" WHERE "id" = ?;', [trans_id]

				validateDB(tx, serverModelCache.getSQL(), successCallback, failureCallback)


		# get conditional representations (if exist)
		lock_id = locks.rows.item(i).lock
		tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], (tx, crs) ->
			#find which resource is under this lock
			tx.executeSql('SELECT * FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id], (tx, locked) ->
				{table, isAttribute} = getCorrectTableInfo(locked.rows.item(0).resource_type)
				if crs.rows.item(0).field_name == "__DELETE"
					# delete said resource
					if isAttribute
						sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 0 WHERE "' + table.idField + '" = ?;'
					else
						sql = 'DELETE FROM "' + table.name + '" WHERE "' + table.idField + '" = ?;'
					
					tx.executeSql(sql, [locked.rows.item(0).resource], continueEndingLock)
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
					sql += ' WHERE "' + table.idField + '"=' + locked.rows.item(0).resource + ';'
					tx.executeSql sql, [], continueEndingLock
				tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock" = ?;', [lock_id]
				tx.executeSql 'DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id]
			)
		)

		tx.executeSql 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock" = ?;', [lock_id]
		tx.executeSql 'DELETE FROM "lock" WHERE "id" = ?;', [lock_id]

	# successCallback = (tx, sqlmod, failureCallback, result)
	# failureCallback = (errors)
	validateDB = (tx, sqlmod, successCallback, failureCallback) ->
		errors = []
		totalQueries = 0
		totalExecuted = 0

		for rule in sqlmod.rules
			totalQueries++
			tx.executeSql(rule.sql, [], do(rule) ->
				(tx, result) ->
					totalExecuted++
					if result.rows.item(0).result in [false, 0]
						errors.push(rule.structuredEnglish)

					if totalQueries == totalExecuted
						if errors.length > 0
							tx.rollback()
							failureCallback(errors)
						else
							tx.end()
							successCallback tx, result
			)
		if totalQueries == 0
			successCallback tx, ""


	# successCallback = (tx, sqlmod, failureCallback, result)
	# failureCallback = (errors)
	executeSasync = (tx, sqlmod, successCallback, failureCallback, result) ->
		# Create tables related to terms and fact types
		for createStatement in sqlmod.createSchema
			tx.executeSql(createStatement)

		# Validate the [empty] model according to the rules.
		# This may eventually lead to entering obligatory data.
		# For the moment it blocks such models from execution.
		validateDB(tx, sqlmod, successCallback, failureCallback)


	# successCallback = (tx, sqlmod, failureCallback, result)
	# failureCallback = (errors)
	executeTasync = (tx, trnmod, successCallback, failureCallback, result) ->
		# Execute transaction model.
		executeSasync(tx, trnmod, (tx, result) ->
			# Hack: Add certain attributes to the transaction model tables.
			# This should eventually be done with SBVR, when we add attributes.
			tx.executeSql 'ALTER TABLE "resource-is_under-lock" ADD COLUMN resource_type TEXT'
			tx.executeSql 'ALTER TABLE "resource-is_under-lock" DROP CONSTRAINT "resource-is_under-lock_resource_id_fkey";'
			tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_name TEXT'
			tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_value TEXT'
			tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_type TEXT'
			tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN lock INTEGER'
			successCallback tx, result
		, (errors) ->
			serverModelCache.setModelAreaDisabled false
			failureCallback(errors)
		, result
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
					Term:      resource
					Term:      transaction
					Term:      lock
					Term:      conditional representation
					Fact type: lock is exclusive
					Fact type: lock is shared
					Fact type: resource is under lock
					Fact type: lock belongs to transaction
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
				executeSasync(tx, sqlmod, (tx, result) ->
					# TODO: fix this as soon as the successCallback mess is fixed
					executeTasync(tx, transactionModel, (tx, result) ->
						serverModelCache.setModelAreaDisabled(true)
						serverModelCache.setServerOnAir true
						serverModelCache.setLastSE se
						serverModelCache.setLF lfmod
						serverModelCache.setPrepLF prepmod
						serverModelCache.setSQL sqlmod
						serverModelCache.setTrans transactionModel
						res.json(result)
					, (errors) ->
						res.json(errors, 404)
					, result
					)
				, (errors) ->
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
			imported = 0
			db.transaction (tx) ->
				for query in queries when query.trim().length > 0
					do (query) ->
						tx.executeSql query, [], ((tx, result) ->
							console.log "Import Success", imported++
						), (tx, error) ->
							console.log query
							console.log error
			res.send(200)
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
												res.json(exported)
										)
							exportsProcessed++
							if exportsProcessed == totalExports
								res.json(exported)
						null
						"name NOT LIKE '%_buk'"
					)
		)
		app.post('/backupdb', serverIsOnAir, (req, res, next) ->
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
			res.send(200)
		)
		app.post('/restoredb', serverIsOnAir, (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList(
					(tx, result) ->
						for i in [0...result.rows.length]
							tbn = result.rows.item(i).name
							tx.dropTable(tbn[0...-4], true)
							tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn[0...-4] + '";')
					null
					"name LIKE '%_buk'"
				)
			res.send(200)
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
					sql += " WHERE " if ftree.length != 1
				else if tree[1][0] == "FactType"
					ft = tree[1][1]
					if isAttribute
						sql = 'SELECT id, _name AS "' + isAttribute.termName + '_name", "' + isAttribute.attributeName + '" FROM "' + table.name + '" WHERE "' + isAttribute.attributeName + '" = 1'
					else
						fl = [ '"' + ft + '".id AS id' ]
						jn = []
						tb = [ '"' + ft + '"' ]

						for row in tree[1][2][1..]
							fl.push '"' + row + '".id AS "' + row + '_id"'
							fl.push '"' + row + '"."_name" AS "' + row + '_name"'
							tb.push '"' + row + '"'
							jn.push '"' + row + '".id = "' + ft + '"."' + row + '"'

						sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ")
					sql += " AND " if ftree.length != 1
				
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
					id = getID tree

					# get all locks of transaction
					db.transaction ((tx) ->
						tx.executeSql 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction" = ?;', [id], (tx, locks) ->
							endLock(tx, locks, 0, id, (tx, result) ->
								res.json(result)
							, (errors) ->
								res.json(errors, 404)
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
					
					db.transaction (tx) ->
						tx.begin()
						tx.executeSql(sql, values, (tx, sqlResult) ->
							validateDB(tx, serverModelCache.getSQL(), (tx, result) ->
								res.json(result,
									location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + if isAttribute then binds[0] else sqlResult.insertId
									201
								)
							, (errors) ->
								res.json(errors, 404)
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
						tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock" = ?;', [id]

						sql = 'INSERT INTO "conditional_representation"' +
							'("lock","field_name","field_type","field_value")' +
							"VALUES (?, ?, ?, ?)"
						for pair in req.body
							for own key, value of pair
								tx.executeSql(sql, [ id, key, typeof value, value ])
						res.send(200)
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
										validateDB(tx, serverModelCache.getSQL(), (tx, result) ->
											tx.end()
											res.json(result)
										, (errors) ->
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
							tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock" = ?;', [id]
							tx.executeSql 'INSERT INTO "conditional_representation" ("lock","field_name","field_type","field_value")' +
										"VALUES (?,'__DELETE','','')", [id]
							res.send(200)
					else
						db.transaction ((tx) ->
							tx.executeSql 'SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource" = ?) AS result;', [tree[1][1], id], (tx, result) ->
								if result.rows.item(0).result in [1, true]
									tx.begin()
									{table, isAttribute} = getCorrectTableInfo(tree[1][1])
									if isAttribute
										sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 0 WHERE "' + table.idField + '" = ?;'
									else
										sql = 'DELETE FROM "' + table.name + '" WHERE "' + table.idField + '" = ?;'
									
									tx.executeSql(sql, [id], (tx, result) ->
										validateDB(tx, serverModelCache.getSQL(), (tx, result) ->
											tx.end()
											res.json(result)
										, (errors) ->
											res.json(errors, 404)
										)
									)
								else
									res.json([ "The resource is locked and cannot be deleted" ], 404)
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
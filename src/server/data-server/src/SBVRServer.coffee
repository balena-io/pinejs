define(['sbvr-parser/SBVRParser', 'sbvr-compiler/LF2AbstractSQLPrep', 'sbvr-compiler/LF2AbstractSQL', 'sbvr-compiler/AbstractSQL2SQL', 'sbvr-compiler/AbstractSQLRules2SQL', 'sbvr-compiler/AbstractSQL2CLF', 'data-server/ServerURIParser', 'underscore', 'utils/createAsyncQueueCallback'], (SBVRParser, LF2AbstractSQLPrep, LF2AbstractSQL, AbstractSQL2SQL, AbstractSQLRules2SQL, AbstractSQL2CLF, ServerURIParser, _, createAsyncQueueCallback) ->
	exports = {}
	db = null
	
	transactionModel = '''
			Term:      Integer
			Term:      Long Text
			Term:      resource id
				Concept type: Integer
			Term:      resource type
				Concept type: Long Text
			Term:      field name
				Concept type: Long Text
			Term:      field value
				Concept type: Long Text
			Term:      field type
				Concept type: Long Text
			Term:      resource
				Database Value Field: resource_id
			Fact type: resource has resource id
			Fact type: resource has resource type
			Rule:      It is obligatory that each resource has exactly 1 resource type
			Rule:      It is obligatory that each resource has exactly 1 resource id
			Term:      transaction
			Term:      lock
			Term:      conditional representation
				Database Value Field: lock
			Fact type: lock is exclusive
			Fact type: lock is shared
			Fact type: resource is under lock
			Fact type: lock belongs to transaction
			Fact type: conditional representation has field name
			Fact type: conditional representation has field value
			Fact type: conditional representation has field type
			Fact type: conditional representation has lock
			Rule:      It is obligatory that each conditional representation has exactly 1 field name
			Rule:      It is obligatory that each conditional representation has at most 1 field value
			Rule:      It is obligatory that each conditional representation has at most 1 field type
			Rule:      It is obligatory that each conditional representation has exactly 1 lock
			Rule:      It is obligatory that each resource is under at most 1 lock that is exclusive'''
	
	devModel = '''
			Term:      Short Text
			Term:      JSON

			Term:      model
				Database Value Field: model_value
			Term:      vocabulary
				Concept Type: Short Text
			Term:      model type
				Concept Type: Short Text
			Term:      model value
				Concept Type: JSON

			Fact Type: model is of vocabulary
			Rule: It is obligatory that each model is of exactly one vocabulary
			Fact Type: model has model type
			Rule: It is obligatory that each model has exactly one model type 
			Fact Type: model has model value
			Rule: It is obligatory that each model has exactly one model value'''
	
	userModel = '''
			Term:      Hashed
			Term:      Short Text

			Term:      user
				Database Value Field: username
			Term:      username
				Concept Type: Short Text
			Term:      password
				Concept Type: Hashed
			Fact type: user has username
			Rule:      It is obligatory that each user has exactly one username.
			Rule:      It is obligatory that each username is of exactly one user.
			Fact type: user has password
			Rule:      It is obligatory that each user has exactly one password.'''
	
	uiModel = '''
			Term:      Short Text
			Term:      Long Text
			Term:      text
				Concept type: Long Text
			Term:      name
				Concept type: Short Text
			Term:      textarea
				Database id Field: name
				Database Value Field: text
			Fact type: textarea is disabled
			Fact type: textarea has name
			Fact type: textarea has text
			Rule:      It is obligatory that each textarea has exactly 1 name
			Rule:      It is obligatory that each name is of exactly 1 textarea
			Rule:      It is obligatory that each textarea has exactly 1 text'''
	
	serverURIParser = ServerURIParser.createInstance()
	
	sqlModels = {}
	clientModels = {}

	isServerOnAir = do() ->
		onAir = null
		pendingCallbacks = []
		return (funcOrVal) ->
			if funcOrVal == true or funcOrVal == false
				# If we are setting new value then monkey patch to just set value or call callback.
				isServerOnAir = (funcOrVal) ->
					if funcOrVal == true or funcOrVal == false
						onAir = funcOrVal
					else
						funcOrVal(onAir)
				# And call all the callbacks that are pending.
				for callback in pendingCallbacks
					callback(onAir)
				pendingCallbacks = null
			else
				# If we have no value set yet then just add the func to the callback queue
				pendingCallbacks.push(funcOrVal)

	endLock = (tx, locks, trans_id, successCallback, failureCallback) ->
		locksCallback = createAsyncQueueCallback(
			() ->
				tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [trans_id],
					(tx, result) ->
						validateDB(tx, sqlModels['data'], successCallback, failureCallback)
					(tx, error) ->
						failureCallback(tx, [error])
				)
			(errors) -> failureCallback(tx, errors)
		)

		# get conditional representations (if exist)
		for i in [0...locks.rows.length]
			lock_id = locks.rows.item(i).lock
			locksCallback.addWork(3)
			tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], (tx, crs) ->
				# find which resource is under this lock
				tx.executeSql('SELECT r."resource_type", r."resource_id" FROM "resource-is_under-lock" rl JOIN "resource" r ON rl."resource" = r."id" WHERE "lock" = ?;', [lock_id], (tx, locked) ->
					lockedRow = locked.rows.item(0)
					asyncCallback = createAsyncQueueCallback(
						locksCallback.successCallback
						locksCallback.failureCallback
					)
					asyncCallback.addWork(3)
					tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], asyncCallback.successCallback, asyncCallback.errorCallback)
					tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id], asyncCallback.successCallback, asyncCallback.errorCallback)
					requestBody = [{}]
					if crs.rows.item(0).field_name == "__DELETE"
						# delete said resource
						method = 'DELETE'
					else
						# commit conditional_representation
						method = 'PUT'
						for j in [0...crs.rows.length]
							item = crs.rows.item(j)
							requestBody[0][item.field_name] = item.field_value
					clientModel = clientModels['data'].resources[lockedRow.resource_type]
					uri = '/data/' + lockedRow.resource_type + '?filter=' + clientModel.idField + ':' + lockedRow.resource_id
					runURI(method, uri, requestBody, tx, asyncCallback.successCallback, asyncCallback.errorCallback)
					asyncCallback.endAdding()
				)
			)

			tx.executeSql('DELETE FROM "lock-belongs_to-transaction" WHERE "lock" = ?;', [lock_id], locksCallback.successCallback, locksCallback.errorCallback)
			tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lock_id], locksCallback.successCallback, locksCallback.errorCallback)
		locksCallback.endAdding()

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

	# successCallback = (tx, lfModel, slfModel, abstractSqlModel, sqlModel, clientModel)
	# failureCallback = (tx, errors)
	executeModel = (tx, vocab, seModel, successCallback, failureCallback) ->
		try
			lfModel = SBVRParser.matchAll(seModel, 'Process')
		catch e
			console.log('Error parsing model', e)
			return failureCallback(tx, 'Error parsing model')
		slfModel = LF2AbstractSQLPrep.match(lfModel, 'Process')
		abstractSqlModel = LF2AbstractSQL.match(slfModel, 'Process')
		sqlModel = AbstractSQL2SQL.generate(abstractSqlModel)
		clientModel = AbstractSQL2CLF(sqlModel)
		
		# Create tables related to terms and fact types
		for createStatement in sqlModel.createSchema
			tx.executeSql(createStatement)

		# Validate the [empty] model according to the rules.
		# This may eventually lead to entering obligatory data.
		# For the moment it blocks such models from execution.
		validateDB(tx, sqlModel,
			(tx) ->
				sqlModels[vocab] = sqlModel
				clientModels[vocab] = clientModel
				
				serverURIParser.setSQLModel(vocab, abstractSqlModel)
				serverURIParser.setClientModel(vocab, clientModel)
				runURI('PUT', '/dev/model?filter=model_type:se', [{vocabulary: vocab, model_value: seModel}], tx)
				runURI('PUT', '/dev/model?filter=model_type:lf', [{vocabulary: vocab, model_value: lfModel}], tx)
				runURI('PUT', '/dev/model?filter=model_type:slf', [{vocabulary: vocab, model_value: slfModel}], tx)
				runURI('PUT', '/dev/model?filter=model_type:abstractsql', [{vocabulary: vocab, model_value: abstractSqlModel}], tx)
				runURI('PUT', '/dev/model?filter=model_type:sql', [{vocabulary: vocab, model_value: sqlModel}], tx)
				runURI('PUT', '/dev/model?filter=model_type:client', [{vocabulary: vocab, model_value: clientModel}], tx)
				
				successCallback(tx, lfModel, slfModel, abstractSqlModel, sqlModel, clientModel)
			, failureCallback)

	getID = (tree) ->
		id = 0
		# if the id is empty, search the filters for one
		if id is 0
			query = tree[2].query
			for whereClause in query when whereClause[0] == 'Where'
				# TODO: This should use the idField from sqlModel
				for comparison in whereClause[1..] when comparison[0] == "Equals" and comparison[1][2] in ['id', 'name']
					return comparison[2][1]
		return id
	
	runURI = (method, uri, body = {}, tx, successCallback, failureCallback) ->
		uri = decodeURI(uri)
		console.log('Running URI', method, uri, body)
		req =
			tree: serverURIParser.match([method, body, uri], 'Process')
			body: body
		res =
			send: (statusCode) ->
				if statusCode == 404
					failureCallback?()
				else
					successCallback?()
			json: (data) ->
				successCallback?(data)
		switch method
			when 'GET'
				runGet(req, res, tx)
			when 'POST'
				runPost(req, res, tx)
			when 'PUT'
				runPut(req, res, tx)
			when 'DELETE'
				runDelete(req, res, tx)
	
	getAndCheckBindValues = (bindings, values) ->
		bindValues = []
		for binding in bindings
			field = binding[1]
			fieldName = field[1]
			referencedName = binding[0] + '.' + fieldName
			value = if values[referencedName] == undefined then values[fieldName] else values[referencedName]
			{validated, value} = AbstractSQL2SQL.dataTypeValidate(value, field)
			if validated != true
				return '"' + fieldName + '" ' + validated
			bindValues.push(value)
		return bindValues
	
	runGet = (req, res, tx) ->
		processInstance = (resourceModel, instance) ->
			instance = _.clone(instance)
			for field in resourceModel.fields when field[0] == 'JSON' and instance.hasOwnProperty(field[1])
				instance[field[1]] = JSON.parse(instance[field[1]])
			return instance
		
		tree = req.tree
		if tree[2] == undefined
			res.send(404)
		else if tree[2].query?
			{query, bindings} = AbstractSQLRules2SQL.match(tree[2].query, 'ProcessQuery')
			values = getAndCheckBindValues(bindings, tree[2].values)
			console.log(query, values)
			if !_.isArray(values)
				res.json(values, 404)
			else
				runQuery = (tx) ->
					tx.executeSql(query, values,
						(tx, result) ->
							if values.length > 0 && result.rows.length == 0
								res.send(404)
							else
								clientModel = clientModels[tree[1][1]]
								resourceModel = clientModel.resources[tree[2].resourceName]
								data =
									instances:
										(processInstance(resourceModel, result.rows.item(i)) for i in [0...result.rows.length])
									model:
										resourceModel
								res.json(data)
						() ->
							res.send(404)
					)
				if tx?
					runQuery(tx)
				else
					db.transaction(runQuery)
		else
			clientModel = clientModels[tree[1][1]]
			data =
				model:
					clientModel.resources[tree[2].resourceName]
			res.json(data)
	
	runPost = (req, res, tx) ->
		tree = req.tree
		if tree[2] == undefined
			res.send(404)
		else
			{query, bindings} = AbstractSQLRules2SQL.match(tree[2].query, 'ProcessQuery')
			values = getAndCheckBindValues(bindings, tree[2].values)
			console.log(query, values)
			if !_.isArray(values)
				res.json(values, 404)
			else
				vocab = tree[1][1]
				runQuery = (tx) ->
					tx.begin()
					# TODO: Check for transaction locks.
					tx.executeSql(query, values,
						(tx, sqlResult) ->
							validateDB(tx, sqlModels[vocab],
								(tx) ->
									tx.end()
									insertID = if tree[2].query[0] == 'UpdateQuery' then values[0] else sqlResult.insertId
									console.log('Insert ID: ', insertID)
									res.send(201,
										location: '/' + vocab + '/' + tree[2].resourceName + "?filter=" + tree[2].resourceName + ".id:" + insertID
									)
								(tx, errors) ->
									res.json(errors, 404)
							)
						() -> res.send(404)
					)
				if tx?
					runQuery(tx)
				else
					db.transaction(runQuery)
	
	runPut = (req, res, tx) ->
		tree = req.tree
		if tree[2] == undefined
			res.send(404)
		else
			queries = AbstractSQLRules2SQL.match(tree[2].query, 'ProcessQuery')
			
			if _.isArray(queries)
				insertQuery = queries[0]
				updateQuery = queries[1]
			else
				insertQuery = queries
			values = getAndCheckBindValues(insertQuery.bindings, tree[2].values)
			console.log(insertQuery.query, values)
			
			if !_.isArray(values)
				res.json(values, 404)
			else
				vocab = tree[1][1]
				
				doValidate = (tx) ->
					validateDB(tx, sqlModels[vocab],
						(tx) ->
							tx.end()
							res.send(200)
						(tx, errors) ->
							res.json(errors, 404)
					)
				
				id = getID(tree)
				runQuery = (tx) ->
					tx.begin()
					db.transaction( (tx) ->
						tx.executeSql('SELECT NOT EXISTS(SELECT 1 FROM "resource" r JOIN "resource-is_under-lock" AS rl ON rl."resource" = r."id" WHERE r."resource_type" = ? AND r."id" = ?) AS result;', [tree[2].resourceName, id],
							(tx, result) ->
								if result.rows.item(0).result in [0, false]
									res.json([ "The resource is locked and cannot be edited" ], 404)
								else
									tx.executeSql(insertQuery.query, values,
										(tx, result) -> doValidate(tx)
										(tx) ->
											if updateQuery?
												values = getAndCheckBindValues(updateQuery.bindings, tree[2].values)
												console.log(updateQuery.query, values)
												if !_.isArray(values)
													res.json(values, 404)
												else
													tx.executeSql(updateQuery.query, values,
														(tx, result) -> doValidate(tx)
														() -> res.send(404)
													)
											else
												res.send(404)
									)
						)
					)
				if tx?
					runQuery(tx)
				else
					db.transaction(runQuery)
	
	runDelete = (req, res, tx) ->
		tree = req.tree
		if tree[2] == undefined
			res.send(404)
		else
			{query, bindings} = AbstractSQLRules2SQL.match(tree[2].query, 'ProcessQuery')
			values = getAndCheckBindValues(bindings, tree[2].values)
			console.log(query, values)
			if !_.isArray(values)
				res.json(values, 404)
			else
				vocab = tree[1][1]
				runQuery = (tx) ->
					tx.begin()
					tx.executeSql(query, values,
						(tx, result) ->
							validateDB(tx, sqlModels[vocab]
								(tx) ->
									tx.end()
									res.send(200)
								(tx, errors) ->
									res.json(errors, 404)
							)
						() ->
							res.send(404)
					)
				if tx?
					runQuery(tx)
				else
					db.transaction(runQuery)

	# Middleware
	serverIsOnAir = (req, res, next) ->
		isServerOnAir((onAir) ->
			if onAir
				next()
			else
				next('route')
		)

	parseURITree = (req, res, next) ->
		if !req.tree?
			try
				uri = decodeURI(req.url)
				req.tree = serverURIParser.match([req.method, req.body, uri], 'Process')
				console.log(uri, req.tree, req.body)
			catch e
				req.tree = false
		if req.tree == false
			next('route')
		else
			next()

	# Setup function
	exports.setup = (app, requirejs, databaseOptions) ->

		requirejs(['database-layer/db'], (dbModule) ->
			db = dbModule.connect(databaseOptions)
			AbstractSQL2SQL = AbstractSQL2SQL[databaseOptions.engine]
			
			db.transaction( (tx) ->
				executeModel(tx, 'dev', devModel,
					() ->
						console.log('Sucessfully executed dev model.')
					(tx, error) ->
						console.log('Failed to execute dev model.', error)
				)
				runURI('GET', '/dev/model?filter=model_type:sql;vocabulary:data', null, tx
					(result) ->
						sqlModel = result.instances[0].model_value
						clientModel = AbstractSQL2CLF(sqlModel)
						sqlModels['data'] = sqlModel
						serverURIParser.setSQLModel('data', sqlModel)
						clientModels['data'] = clientModel
						serverURIParser.setClientModel('data', clientModel)
						isServerOnAir(true)
					() ->
						isServerOnAir(false)
				)
				executeModel(tx, 'transaction', transactionModel,
					() ->
						console.log('Sucessfully executed transaction model.')
					(tx, error) ->
						console.log('Failed to execute transaction model.', error)
				)
				executeModel(tx, 'user', userModel,
					() ->
						console.log('Sucessfully executed user model.')
					(tx, error) ->
						console.log('Failed to execute user model.', error)
				)
				executeModel(tx, 'ui', uiModel,
					() ->
						console.log('Sucessfully executed ui model.')
					(tx, error) ->
						console.log('Failed to execute ui model.', error)
				)
			)
		)

		app.get('/onair',
			(req, res, next) -> 
				isServerOnAir((onAir) ->
					res.json(onAir)
				)
		)
		app.post('/update',		serverIsOnAir,	(req, res, next) -> res.send(404))
		app.post('/execute',					(req, res, next) ->
			runURI('GET', '/ui/textarea?filter=name:model_area', null, null,
				(result) ->
					seModel = result.instances[0].text
					db.transaction((tx) ->
						tx.begin()
						executeModel(tx, 'data', seModel,
							(tx, lfModel, slfModel, abstractSqlModel, sqlModel, clientModel) ->
								runURI('PUT', '/ui/textarea-is_disabled?filter=textarea.name:model_area/', [{value: true}], tx)
								isServerOnAir(true)
								res.send(200)
							(tx, errors) ->
								res.json(errors, 404)
						)
					)
				() -> res.send(404)
			)
		)
		app.del('/cleardb', (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList( (tx, result) ->
					for i in [0...result.rows.length]
						tx.dropTable(result.rows.item(i).name)
					executeModel(tx, 'transaction', transactionModel,
						() ->
							console.log('Sucessfully executed transaction model.')
						(tx, error) ->
							console.log('Failed to execute transaction model.', error)
					)
					executeModel(tx, 'dev', devModel,
						() ->
							console.log('Sucessfully executed dev model.')
						(tx, error) ->
							console.log('Failed to execute dev model.', error)
					)
					executeModel(tx, 'user', userModel,
						() ->
							console.log('Sucessfully executed user model.')
						(tx, error) ->
							console.log('Failed to execute user model.', error)
					)
					executeModel(tx, 'ui', uiModel,
						() ->
							console.log('Sucessfully executed ui model.')
						(tx, error) ->
							console.log('Failed to execute ui model.', error)
					)
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
		app.post('/transaction/execute/*', serverIsOnAir, (req, res, next) ->
			# id = req.id
			id = req.url.split('/')
			id = id[id.length-1]

			# get all locks of transaction
			db.transaction ((tx) ->
				tx.executeSql('SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction" = ?;', [id], (tx, locks) ->
					endLock(tx, locks, id, (tx) ->
						res.send(200)
					, (tx, errors) ->
						res.json(errors, 404)
					)
				)
			)
		)
		
		app.get('/dev/*', parseURITree, (req, res, next) ->
			runGet(req, res)
		)
		app.get('/ui/*', parseURITree, (req, res, next) ->
			runGet(req, res)
		)
		app.get('/transaction/*', serverIsOnAir, parseURITree, (req, res, next) ->
			tree = req.tree
			if tree[2] == undefined
				__TODO__.die()
			else
				if tree[2].resourceName == 'transaction'
					{query, bindings} = AbstractSQLRules2SQL.match(tree[2].query, 'ProcessQuery')
					values = getAndCheckBindValues(bindings, tree[2].values)
					console.log(query, values)
					if !_.isArray(values)
						res.json(values, 404)
					else
						db.transaction( (tx) ->
							tx.executeSql(query, values,
								(tx, result) ->
									if result.rows.length > 1
										__TODO__.die()
									res.json(
										id: result.rows.item(0).id
										tcURI: "/transaction"
										lcURI: "/transaction/lock"
										tlcURI: "/transaction/lock-belongs_to-transaction"
										rcURI: "/transaction/resource"
										lrcURI: "/transaction/resource-is_under-lock"
										slcURI: "/transaction/lock-is_shared"
										xlcURI: "/transaction/lock-is_exclusive"
										ctURI: "/transaction/execute/" + result.rows.item(0).id
									)
								() ->
									res.send(404)
							)
						)
				else
					runGet(req, res)
		)
		app.get('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			tree = req.tree
			if tree[2] == undefined
				res.json(clientModels[tree[1][1]].resources)
			else
				runGet(req, res)
		)

		app.post('/transaction/*', serverIsOnAir, parseURITree, (req, res, next) ->
			runPost(req, res)
		)
		app.post('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			runPost(req, res)
		)

		app.put('/ui/*', parseURITree, (req, res, next) ->
			runPut(req, res)
		)
		app.put('/transaction/*', serverIsOnAir, parseURITree, (req, res, next) ->
			runPut(req, res)
		)
		app.put('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			runPut(req, res)
		)

		app.del('/transaction/*', serverIsOnAir, parseURITree, (req, res, next) ->
			runDelete(req, res)
		)
		app.del('/data/*', serverIsOnAir, parseURITree, (req, res, next) ->
			runDelete(req, res)
		)

		app.del('/', serverIsOnAir, (req, res, next) ->
			# return
			# TODO: This should be reorganised to be properly async.
			db.transaction ((sqlmod) ->
				(tx) ->
					for dropStatement in sqlmod.dropSchema
						tx.executeSql(dropStatement)
			)(sqlModels['data'])
			
			# TODO: This should be done a better way?
			runURI('DELETE', '/ui/textarea-is_disabled?filter=textarea.name:model_area/')
			runURI('PUT', '/ui/textarea?filter=name:model_area/', [{text: ''}])

			runURI('DELETE', '/dev/model?filter=model_type:se;vocabulary:data', null, tx)
			runURI('DELETE', '/dev/model?filter=model_type:lf;vocabulary:data', null, tx)
			runURI('DELETE', '/dev/model?filter=model_type:slf;vocabulary:data', null, tx)
			runURI('DELETE', '/dev/model?filter=model_type:abstractsql;vocabulary:data', null, tx)
			runURI('DELETE', '/dev/model?filter=model_type:sql;vocabulary:data', null, tx)
			runURI('DELETE', '/dev/model?filter=model_type:client;vocabulary:data', null, tx)
			sqlModels['data'] = []
			serverURIParser.setSQLModel('data', sqlModels['data'])
			clientModels['data'] = []
			serverURIParser.setClientModel('data', clientModels['data'])
			isServerOnAir(false)

			res.send(200)
		)
	return exports
)
define([
	'ometa!sbvr-parser/SBVRParser'
	'ometa!sbvr-compiler/LF2AbstractSQLPrep'
	'ometa!sbvr-compiler/LF2AbstractSQL'
	'cs!sbvr-compiler/AbstractSQL2SQL'
	'ometa!sbvr-compiler/AbstractSQLRules2SQL'
	'cs!sbvr-compiler/AbstractSQL2CLF'
	'ometa!server-glue/ServerURIParser'
	'cs!utils/createAsyncQueueCallback'
	'underscore'
], (SBVRParser, LF2AbstractSQLPrep, LF2AbstractSQL, AbstractSQL2SQL, AbstractSQLRules2SQL, AbstractSQL2CLF, ServerURIParser, createAsyncQueueCallback, _) ->
	exports = {}
	db = null
	
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
	
	transactionModel = '''
			Term:      Integer
			Term:      Short Text
			Term:      Long Text
			Term:      resource id
				Concept type: Integer
			Term:      resource type
				Concept type: Long Text
			Term:      field name
				Concept type: Long Text
			Term:      field value
				Concept type: Long Text
			Term:      placeholder
				Concept type: Short Text

			Term:      resource
				Database Value Field: resource_id
			Fact type: resource has resource id
			Rule:      It is obligatory that each resource has exactly 1 resource id.
			Fact type: resource has resource type
			Rule:      It is obligatory that each resource has exactly 1 resource type.
			
			Term:      transaction
				Database Value Field: id
			
			Term:      lock
				Database Value Field: id
			Fact type: lock is exclusive
			Fact type: lock belongs to transaction
			Rule:      It is obligatory that each lock belongs to exactly 1 transaction.
			Fact type: resource is under lock
				Synonymous Form: lock is on resource
			Rule:      It is obligatory that each resource that is under a lock that is exclusive, is under at most 1 lock.

			Term:      conditional type
				Concept Type: Short Text
				Definition: ADD or EDIT or DELETE

			Term:      conditional resource
				Database Value Field: id
			Fact type: conditional resource belongs to transaction
			Rule:      It is obligatory that each conditional resource belongs to exactly 1 transaction.
			Fact type: conditional resource has lock
			Rule:      It is obligatory that each conditional resource has at most 1 lock.
			Fact type: conditional resource has resource type
			Rule:      It is obligatory that each conditional resource has exactly 1 resource type.
			Fact type: conditional resource has conditional type
			Rule:      It is obligatory that each conditional resource has exactly 1 conditional type.
			Fact type: conditional resource has placeholder
			Rule:      It is obligatory that each conditional resource has at most 1 placeholder.
			--Rule:      It is obligatory that each conditional resource that has a placeholder, has a conditional type that is of "ADD".

			Term:      conditional field
				Database Value Field: field_name
			Fact type: conditional field has field name
			Rule:      It is obligatory that each conditional field has exactly 1 field name.
			Fact type: conditional field has field value
			Rule:      It is obligatory that each conditional field has at most 1 field value.
			Fact type: conditional field is of conditional resource
			Rule:      It is obligatory that each conditional field is of exactly 1 conditional resource.

			--Rule:      It is obligatory that each conditional resource that has a conditional type that is of "EDIT" or "DELETE", has a lock that is exclusive
			Rule:      It is obligatory that each conditional resource that has a lock, has a resource type that is of a resource that the lock is on.
			Rule:      It is obligatory that each conditional resource that has a lock, belongs to a transaction that the lock belongs to.'''

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
	
	serverURIParser = ServerURIParser.createInstance()
	
	sqlModels = {}
	clientModels = {}
	
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

	endTransaction = (transactionID, callback) ->
		db.transaction((tx) ->
			placeholders = {}
			getLockedRow = (lockID, callback) ->
				tx.executeSql('''SELECT r."resource_type", r."resource_id"
								FROM "resource-is_under-lock" rl
								JOIN "resource" r ON rl."resource" = r."id"
								WHERE "lock" = ?;''', [lockID],
					(tx, row) -> callback(null, row)
					(tx, err) -> callback(err)
				)
			getFieldsObject = (conditionalResourceID, clientModel, callback) ->
				tx.executeSql('SELECT "field_name", "field_value" FROM "conditional_field" WHERE "conditional_resource" = ?;', [conditionalResourceID],
					(tx, fields) ->
						fieldsObject = {}
						async.forEach(fields.rows,
							(field, callback) ->
								fieldName = field.field_name
								fieldName = fieldName.replace(clientModel.resourceName + '.', '')
								fieldValue = field.field_value
								async.forEach(clientModel.fields,
									(modelField, callback) ->
										placeholderCallback = (placeholder, resolvedID) ->
											if resolvedID == false
												callback('Placeholder failed' + fieldValue)
											else
												fieldsObject[fieldName] = resolvedID
												callback()
										if modelField[1] == fieldName and modelField[0] == 'ForeignKey' and _.isNaN(Number(fieldValue))
											if !placeholders.hasOwnProperty(fieldValue)
												return callback('Cannot resolve placeholder' + fieldValue)
											else if _.isArray(placeholders[fieldValue])
												placeholders[fieldValue].push(placeholderCallback)
											else
												placeholderCallback(fieldValue, placeholders[fieldValue])
										else
											fieldsObject[fieldName] = fieldValue
											callback()
									callback
								)
							(err) ->
								callback(err, fieldsObject)
						)
					(tx, err) -> callback(err)
				)
			resolvePlaceholder = (placeholder, resolvedID) -> 
				placeholderCallbacks = placeholders[placeholder]
				placeholders[placeholder] = resolvedID
				for placeholderCallback in placeholderCallbacks
					placeholderCallback(placeholder, resolvedID)
			
			tx.executeSql('SELECT * FROM "conditional_resource" WHERE "transaction" = ?;', [transactionID],
				(tx, conditionalResources) ->
					conditionalResources.rows.forEach((conditionalResource) ->
						placeholder = conditionalResource.placeholder
						if placeholder? and placeholder.length > 0
							placeholders[placeholder] = []
					)
					
					# get conditional resources (if exist)
					async.forEach(conditionalResources.rows,
						(conditionalResource, callback) ->
							placeholder = conditionalResource.placeholder
							lockID = conditionalResource.lock
							doCleanup = () ->
								async.parallel([
										(callback) ->
											tx.executeSql('DELETE FROM "conditional_field" WHERE "conditional_resource" = ?;', [conditionalResource.id],
												-> callback()
												(tx, err) -> callback(err)
											)
										(callback) ->
											tx.executeSql('DELETE FROM "conditional_resource" WHERE "lock" = ?;', [lockID],
												-> callback()
												(tx, err) -> callback(err)
											)
										(callback) ->
											tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lockID],
												-> callback()
												(tx, err) -> callback(err)
											)
										(callback) ->
											tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lockID],
												-> callback()
												(tx, err) -> callback(err)
											)
									]
									callback
								)
							
							clientModel = clientModels['data'].resources[conditionalResource.resource_type]
							uri = '/data/' + conditionalResource.resource_type
							requestBody = [{}]
							switch conditionalResource.conditional_type
								when 'DELETE'
									getLockedRow(lockID, (err, lockedRow) ->
										if err?
											callback(err)
										else
											lockedRow = lockedRow.rows.item(0)
											uri = uri + '?filter=' + clientModel.idField + ':' + lockedRow.resource_id
											runURI('DELETE', uri, requestBody, tx, doCleanup, -> callback(arguments))
									)
								when 'EDIT'
									getLockedRow(lockID, (err, lockedRow) ->
										if err?
											callback(err)
										else
											lockedRow = lockedRow.rows.item(0)
											uri = uri + '?filter=' + clientModel.idField + ':' + lockedRow.resource_id
											getFieldsObject(conditionalResource.id, clientModel,
												(err, fields) ->
													if err?
														callback(err)
													else
														runURI('PUT', uri, [fields], tx, doCleanup, -> callback(arguments))
											)
									)
								when 'ADD'
									getFieldsObject(conditionalResource.id, clientModel, (err, fields) ->
										if err?
											resolvePlaceholder(placeholder, false)
											callback(err)
										else
											runURI('POST', uri, [fields], tx,
												(result) ->
													resolvePlaceholder(placeholder, result.id)
													doCleanup()
												->
													resolvePlaceholder(placeholder, false)
													callback(arguments)
											)
									)
						(err) ->
							if err?
								callback(err)
							else
								tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [transactionID],
									(tx, result) ->
										validateDB(tx, sqlModels['data'],
											-> callback()
											(tx, err) -> callback(err)
										)
									(tx, err) ->
										callback(err)
								)
					)
				)
		)

	# successCallback = (tx, sqlmod, failureCallback, result)
	# failureCallback = (tx, errors)
	validateDB = (tx, sqlmod, successCallback, failureCallback) ->
		async.forEach(sqlmod.rules,
			(rule, callback) ->
				tx.executeSql(rule.sql, [],
					(tx, result) ->
						if result.rows.item(0).result in [false, 0, '0']
							callback(rule.structuredEnglish)
						else
							callback()
					(tx, err) -> callback(err)
				)
			(err) ->
				if err?
					tx.rollback()
					failureCallback(tx, err)
				else
					tx.end()
					successCallback(tx)
		)

	# successCallback = (tx, lfModel, slfModel, abstractSqlModel, sqlModel, clientModel)
	# failureCallback = (tx, errors)
	exports.executeModel = executeModel = (tx, vocab, seModel, successCallback, failureCallback) ->
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

	exports.deleteModel = (vocabulary) ->
		# TODO: This should be reorganised to be async.
		db.transaction ((sqlmod) ->
			(tx) ->
				for dropStatement in sqlmod.dropSchema
					tx.executeSql(dropStatement)
				runURI('DELETE', '/dev/model?filter=model_type:se', [{vocabulary}], tx)
				runURI('DELETE', '/dev/model?filter=model_type:lf', [{vocabulary}], tx)
				runURI('DELETE', '/dev/model?filter=model_type:slf', [{vocabulary}], tx)
				runURI('DELETE', '/dev/model?filter=model_type:abstractsql', [{vocabulary}], tx)
				runURI('DELETE', '/dev/model?filter=model_type:sql', [{vocabulary}], tx)
				runURI('DELETE', '/dev/model?filter=model_type:client', [{vocabulary}], tx)

				sqlModels[vocabulary] = []
				serverURIParser.setSQLModel(vocabulary, sqlModels[vocabulary])
				clientModels[vocabulary] = []
				serverURIParser.setClientModel(vocabulary, clientModels[vocabulary])
		)

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
	
	exports.runURI = runURI = (method, uri, body = {}, tx, successCallback, failureCallback) ->
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
	
	exports.runGet = runGet = (req, res, tx) ->
		processInstance = (resourceModel, instance) ->
			instance = _.clone(instance)
			for field in resourceModel.fields when field[0] == 'JSON' and instance.hasOwnProperty(field[1])
				instance[field[1]] = JSON.parse(instance[field[1]])
			return instance
		
		tree = req.tree
		if tree[2] == undefined
			res.json(clientModels[tree[1][1]].resources)
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
	
	exports.runPost = runPost = (req, res, tx) ->
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
									res.json({
											id: insertID
										}, {
											location: '/' + vocab + '/' + tree[2].resourceName + "?filter=" + tree[2].resourceName + ".id:" + insertID
										}, 201
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
	
	exports.runPut = runPut = (req, res, tx) ->
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
					tx.executeSql('''
						SELECT NOT EXISTS(
							SELECT 1
							FROM "resource" r
							JOIN "resource-is_under-lock" AS rl ON rl."resource" = r."id"
							WHERE r."resource_type" = ?
							AND r."id" = ?
						) AS result;''', [tree[2].resourceName, id],
						(tx, result) ->
							if result.rows.item(0).result in [false, 0, '0']
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
				if tx?
					runQuery(tx)
				else
					db.transaction(runQuery)
	
	exports.runDelete = runDelete = (req, res, tx) ->
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

	exports.parseURITree = parseURITree = (req, res, next) ->
		if !req.tree?
			try
				uri = decodeURI(req.url)
				req.tree = serverURIParser.match([req.method, req.body, uri], 'Process')
				console.log(uri, req.tree, req.body)
			catch e
				console.error('Failed to parse URI tree', req.url, e.message, e.stack)
				req.tree = false
		if req.tree == false
			next('route')
		else
			next()

	exports.executeStandardModels = executeStandardModels = (tx) ->
		executeModel(tx, 'dev', devModel,
			() ->
				console.log('Sucessfully executed dev model.')
			(tx, error) ->
				console.error('Failed to execute dev model.', error)
		)
		executeModel(tx, 'transaction', transactionModel,
			() ->
				console.log('Sucessfully executed transaction model.')
			(tx, error) ->
				console.error('Failed to execute transaction model.', error)
		)
		executeModel(tx, 'user', userModel,
			() ->
				# TODO: Remove these hardcoded users.
				runURI('POST', '/user/user', [{'user.username': 'test', 'user.password': 'test'}], null)
				runURI('POST', '/user/user', [{'user.username': 'test2', 'user.password': 'test2'}], null)
				console.log('Sucessfully executed user model.')
			(tx, error) ->
				console.error('Failed to execute user model.', error)
		)

	exports.setup = (app, requirejs, databaseOptions) ->
		requirejs(['cs!database-layer/db'], (dbModule) ->
			db = dbModule.connect(databaseOptions)
			AbstractSQL2SQL = AbstractSQL2SQL[databaseOptions.engine]
			db.transaction((tx) ->
				executeStandardModels(tx)
				runURI('GET', '/dev/model?filter=model_type:sql;vocabulary:data', null, tx
					(result) ->
						for instance in result.instances
							vocab = instance.vocabulary
							sqlModel = instance.model_value
							clientModel = AbstractSQL2CLF(sqlModel)
							sqlModels[vocab] = sqlModel
							serverURIParser.setSQLModel(vocab, sqlModel)
							clientModels[vocab] = clientModel
							serverURIParser.setClientModel(vocab, clientModel)
				)
			)
		)
		app.get('/dev/*', parseURITree, (req, res, next) ->
			runGet(req, res)
		)
		app.post('/transaction/execute', (req, res, next) ->
			id = Number(req.body.id)
			if _.isNaN(id)
				res.send(404)
			else
				endTransaction(id, (err) ->
					if err?
						console.error(err)
						res.json(err, 404)
					else
						res.send(200)
				)
		)
		app.get('/transaction', (req, res, next) ->
			res.json(
				transactionURI: "/transaction/transaction"
				conditionalResourceURI: "/transaction/conditional_resource"
				conditionalFieldURI: "/transaction/conditional_field"
				lockURI: "/transaction/lock"
				transactionLockURI: "/transaction/lock-belongs_to-transaction"
				resourceURI: "/transaction/resource"
				lockResourceURI: "/transaction/resource-is_under-lock"
				exclusiveLockURI: "/transaction/lock-is_exclusive"
				commitTransactionURI: "/transaction/execute"
			)
		)
		app.get('/transaction/*', parseURITree, (req, res, next) ->
			runGet(req, res)
		)
		app.post('/transaction/*', parseURITree, (req, res, next) ->
			runPost(req, res)
		)
		app.put('/transaction/*', parseURITree, (req, res, next) ->
			runPut(req, res)
		)
		app.del('/transaction/*', parseURITree, (req, res, next) ->
			runDelete(req, res)
		)

	return exports
)

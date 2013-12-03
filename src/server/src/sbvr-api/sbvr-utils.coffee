define [
	'exports'
	'has'
	'cs!extended-sbvr-parser'
	'lf-to-abstract-sql'
	'cs!sbvr-compiler/AbstractSQL2SQL'
	'abstract-sql-compiler'
	'cs!sbvr-compiler/AbstractSQL2CLF'
	'cs!sbvr-compiler/ODataMetadataGenerator'
	'cs!sbvr-api/permissions'
	'cs!sbvr-api/uri-parser'
	'lodash'
	'bluebird'
	'cs!sbvr-compiler/types'
	'text!sbvr-api/dev.sbvr'
	'text!sbvr-api/transaction.sbvr'
	'text!sbvr-api/user.sbvr'
], (exports, has, SBVRParser, LF2AbstractSQL, AbstractSQL2SQL, AbstractSQLCompiler, AbstractSQL2CLF, ODataMetadataGenerator, permissions, uriParser, _, Promise, sbvrTypes, devModel, transactionModel, userModel) ->
	exports = {}
	db = null

	_.extend(exports, permissions)

	fetchProcessing = _.mapValues sbvrTypes, ({fetchProcessing}) ->
		if fetchProcessing?
			Promise.promisify(fetchProcessing)

	LF2AbstractSQLTranslator = LF2AbstractSQL.createTranslator(sbvrTypes)

	seModels = {}
	sqlModels = {}
	clientModels = {}
	odataMetadata = {}

	checkForConstraintError = (err, tableName) ->
		if db.engine not in ['postgres', 'mysql']
			if err == 'could not execute statement (19 constraint failed)'
				# SQLite
				return ['Constraint failed.']
			return false

		# Unique key
		switch db.engine
			when 'mysql'
				matches = /ER_DUP_ENTRY: Duplicate entry '.*?[^\\]' for key '(.*?[^\\])'/.exec(err)
			when 'postgres'
				matches = new RegExp('error: duplicate key value violates unique constraint "' + tableName + '_(.*?)_key"').exec(err)
		if matches?
			return ['"' + matches[1] + '" must be unique.']

		# Foreign Key
		switch db.engine
			when 'mysql'
				matches = /ER_ROW_IS_REFERENCED_: Cannot delete or update a parent row: a foreign key constraint fails \(".*?"\.(".*?").*/.exec(err)
			when 'postgres'
				matches = new RegExp('error: update or delete on table "' + tableName + '" violates foreign key constraint ".*?" on table "(.*?)"').exec(err)
		if matches?
			return ['Data is referenced by ' + matches[1].replace(/\ /g, '_').replace(/-/g, '__') + '.']
		return false

	getAndCheckBindValues = (vocab, bindings, values) ->
		mappings = clientModels[vocab].resourceToSQLMappings
		sqlModelTables = sqlModels[vocab].tables
		Promise.map(bindings, (binding) ->
			if _.isString(binding[1])
				[tableName, fieldName] = binding

				referencedName = tableName + '.' + fieldName
				value = values[referencedName]
				if value is undefined
					value = values[fieldName]

				[mappedTableName, mappedFieldName] = mappings[tableName][fieldName]
				field = _.find(sqlModelTables[mappedTableName].fields, {
					fieldName: mappedFieldName
				})
			else
				[dataType, value] = binding
				field = {dataType}

			if value is undefined
				return db.DEFAULT_VALUE

			AbstractSQL2SQL.dataTypeValidate(value, field)
			.catch((err) ->
				throw new Error('"' + fieldName + '" ' + err)
			)
		)

	endTransaction = (transactionID) ->
		db.transaction()
		.then((tx) ->
			placeholders = {}
			getLockedRow = (lockID) ->
				# 'GET', '/transaction/resource?$select=resource_id&$filter=resource__is_under__lock/lock eq ?'
				tx.executeSql('''SELECT "resource"."resource id" AS "resource_id"
								FROM "resource",
									"resource-is_under-lock"
								WHERE "resource"."id" = "resource-is_under-lock"."resource"
								AND "resource-is_under-lock"."lock" = ?;''', [lockID])
			getFieldsObject = (conditionalResourceID, clientModel) ->
				# 'GET', '/transaction/conditional_field?$select=field_name,field_value&$filter=conditional_resource eq ?'
				tx.executeSql('''SELECT "conditional_field"."field name" AS "field_name", "conditional_field"."field value" AS "field_value"
								FROM "conditional_field"
								WHERE "conditional_field"."conditional resource" = ?;''', [conditionalResourceID])
				.then((fields) ->
					fieldsObject = {}
					Promise.all(fields.rows.map (field) ->
						fieldName = field.field_name.replace(clientModel.resourceName + '.', '')
						fieldValue = field.field_value
						modelField = _.find(clientModel.fields, {fieldName})
						if modelField.dataType == 'ForeignKey' and _.isNaN(Number(fieldValue))
							if !placeholders.hasOwnProperty(fieldValue)
								throw new Error('Cannot resolve placeholder' + fieldValue)
							else
								placeholders[fieldValue].promise
								.then((resolvedID) ->
									fieldsObject[fieldName] = resolvedID
								).catch(->
									throw new Error('Placeholder failed' + fieldValue)
								)
						else
							fieldsObject[fieldName] = fieldValue
					).then(->
						return fieldsObject
					)
				)

			# 'GET', '/transaction/conditional_resource?$filter=transaction eq ?'
			tx.executeSql('''SELECT "conditional_resource"."id", "conditional_resource"."transaction", "conditional_resource"."lock", "conditional_resource"."resource type" AS "resource_type", "conditional_resource"."conditional type" AS "conditional_type", "conditional_resource"."placeholder"
							FROM "conditional_resource"
							WHERE "conditional_resource"."transaction" = ?;''', [transactionID])
			.then((conditionalResources) ->
				conditionalResources.rows.forEach (conditionalResource) ->
					placeholder = conditionalResource.placeholder
					if placeholder? and placeholder.length > 0
						placeholders[placeholder] = Promise.pending()

				# get conditional resources (if exist)
				Promise.all(conditionalResources.rows.map (conditionalResource) ->
					placeholder = conditionalResource.placeholder
					lockID = conditionalResource.lock
					doCleanup = ->
						Promise.all([
							tx.executeSql('DELETE FROM "conditional_field" WHERE "conditional resource" = ?;', [conditionalResource.id])
							tx.executeSql('DELETE FROM "conditional_resource" WHERE "lock" = ?;', [lockID])
							tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lockID])
							tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lockID])
						])

					clientModel = clientModels['data'].resources[conditionalResource.resource_type]
					uri = '/data/' + conditionalResource.resource_type
					switch conditionalResource.conditional_type
						when 'DELETE'
							getLockedRow(lockID)
							.then((lockedRow) ->
								lockedRow = lockedRow.rows.item(0)
								uri = uri + '?$filter=' + clientModel.idField + ' eq ' + lockedRow.resource_id
								runURI('DELETE', uri, {}, tx)
							)
							.then(doCleanup)
						when 'EDIT'
							getLockedRow(lockID)
							.then((lockedRow) ->
								lockedRow = lockedRow.rows.item(0)
								getFieldsObject(conditionalResource.id, clientModel)
								.then((fields) ->
									fields[clientModel.idField] = lockedRow.resource_id
									runURI('PUT', uri, fields, tx)
								)
							).then(doCleanup)
						when 'ADD'
							getFieldsObject(conditionalResource.id, clientModel)
							.then((fields) ->
								runURI('POST', uri, fields, tx)
							).then((result) ->
								placeholders[placeholder].fulfill(result.id)
							).then(doCleanup)
							.catch((err) ->
								placeholders[placeholder].reject(err)
								throw err
							)
				)
			).then((err) ->
				tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [transactionID])
			).then((result) ->
				validateDB(tx, sqlModels['data'])
			).catch((err) ->
				tx.rollback()
				throw err
			).then(->
				tx.end()
			)
		)

	validateDB = (tx, sqlmod) ->
		Promise.map(sqlmod.rules, (rule) ->
			tx.executeSql(rule.sql, rule.bindings)
			.then((result) ->
				if result.rows.item(0).result in [false, 0, '0']
					throw rule.structuredEnglish
			)
		)

	exports.executeModel = executeModel = (tx, vocab, seModel, callback) ->
		models = {}
		models[vocab] = seModel
		executeModels(tx, models, callback)
	exports.executeModels = executeModels = (tx, models, callback) ->
		Promise.map(_.keys(models), (vocab) ->
			seModel = models[vocab]
			try
				lfModel = SBVRParser.matchAll(seModel, 'Process')
			catch e
				console.error('Error parsing model', vocab, e, e.stack)
				throw new Error(['Error parsing model', e])
			try
				abstractSqlModel = LF2AbstractSQLTranslator(lfModel, 'Process')
				sqlModel = AbstractSQL2SQL.generate(abstractSqlModel)
				clientModel = AbstractSQL2CLF(sqlModel)
				metadata = ODataMetadataGenerator(vocab, sqlModel)
			catch e
				console.error('Error compiling model', vocab, e, e.stack)
				throw new Error(['Error compiling model', e])

			# Create tables related to terms and fact types
			Promise.map(sqlModel.createSchema, (createStatement) ->
				tx.executeSql(createStatement)
				.catch(->
					# Warning: We ignore errors in the create table statements as SQLite doesn't support CREATE IF NOT EXISTS
				)
			).then(->
				# Validate the [empty] model according to the rules.
				# This may eventually lead to entering obligatory data.
				# For the moment it blocks such models from execution.
				validateDB(tx, sqlModel)
			).then(->
				seModels[vocab] = seModel
				sqlModels[vocab] = sqlModel
				clientModels[vocab] = clientModel
				odataMetadata[vocab] = metadata

				uriParser.addClientModel(vocab, clientModel)

				updateModel = (modelType, model) ->
					runURI('GET', "/dev/model?$select=id&$filter=vocabulary eq '" + encodeURIComponent(vocab) + "' and model_type eq '" + encodeURIComponent(modelType) + "'", null, tx)
					.then((result) ->
						method = 'POST'
						uri = '/dev/model'
						body =
							vocabulary: vocab
							model_value: model
							model_type: modelType
						id = result?.d?[0]?.id ? null
						if id?
							uri += '(' + id + ')'
							method = 'PUT'
							body.id = id

						runURI(method, uri, body, tx)
					)

				Promise.all([
					updateModel('se', seModel)
					updateModel('lf', lfModel)
					updateModel('abstractsql', abstractSqlModel)
					updateModel('sql', sqlModel)
					updateModel('client', clientModel)
				])
			)
		).nodeify(callback)

	exports.deleteModel = (vocabulary, callback) ->
		db.transaction()
		.then((tx) ->
			dropStatements =
				_.map sqlModels[vocabulary]?.dropSchema, (dropStatement) ->
					tx.executeSql(dropStatement)
			Promise.all(dropStatements.concat([
				runURI('DELETE', "/dev/model?$filter=vocabulary eq '" + encodeURIComponent(vocabulary) + "'", null, tx)
			])).then(->
				tx.end()
				delete seModels[vocabulary]
				delete sqlModels[vocabulary]
				delete clientModels[vocabulary]
				delete odataMetadata[vocabulary]
				uriParser.deleteClientModel(vocabulary)
			).catch((err) ->
				tx.rollback()
				throw err
			)
		).nodeify(callback)

	getID = (tree) ->
		request = tree.requests[0]
		idField = sqlModels[tree.vocabulary].tables[request.resourceName].idField
		for whereClause in request.query when whereClause[0] == 'Where'
			for comparison in whereClause[1..] when comparison[0] == 'Equals'
				if comparison[1][2] == idField
					return comparison[2][1]
				if comparison[2][2] == idField
					return comparison[1][1]
		return 0

	checkForExpansion = (vocab, clientModel, fieldName, instance) ->
		Promise.try ->
			try
				field = JSON.parse(instance[fieldName])
			catch e
				# If we can't JSON.parse the field then it's not one needing expansion.
				return

			if _.isArray(field)
				# Hack to look like a rows object
				field.item = (i) -> @[i]
				processOData(vocab, clientModel, fieldName, field)
				.then((expandedField) ->
					instance[fieldName] = expandedField
					return
				)
			else
				instance[fieldName] = {
					__deferred:
						uri: '/' + vocab + '/' + fieldName + '(' + field + ')'
					__id: field
				}
				return

	processOData = (vocab, clientModel, resourceName, rows) ->
		if rows.length is 0
			return Promise.fulfilled([])

		resourceModel = clientModel[resourceName]

		instances = rows.map (instance) ->
			instance.__metadata =
				uri: '/' + vocab + '/' + resourceModel.resourceName + '(' + instance[resourceModel.idField] + ')'
				type: ''
			return instance
		instancesPromise = Promise.fulfilled()

		expandableFields = do ->
			fieldNames = {}
			for {fieldName, dataType} in resourceModel.fields when dataType != 'ForeignKey'
				fieldNames[fieldName.replace(/\ /g, '_')] = true
			return _.filter(_.keys(instances[0]), (fieldName) -> fieldName[0..1] != '__' and !fieldNames.hasOwnProperty(fieldName))
		if expandableFields.length > 0
			instancesPromise = Promise.map instances, (instance) ->
				Promise.map expandableFields, (fieldName) ->
					checkForExpansion(vocab, clientModel, fieldName, instance)

		processedFields = _.filter(resourceModel.fields, ({dataType}) -> fetchProcessing[dataType]?)
		if processedFields.length > 0
			instancesPromise = instancesPromise.then ->
				Promise.map instances, (instance) ->
					Promise.map processedFields, ({fieldName, dataType}) ->
						fieldName = fieldName.replace(/\ /g, '_')
						if instance.hasOwnProperty(fieldName)
							fetchProcessing[dataType](instance[fieldName])
							.then((result) ->
								instance[fieldName] = result
								return
							)

		instancesPromise.then(->
			return instances
		)

	exports.runRule = do ->
		LF2AbstractSQLPrepHack = LF2AbstractSQL.LF2AbstractSQLPrep._extend({CardinalityOptimisation: -> @_pred(false)})
		translator = LF2AbstractSQL.LF2AbstractSQL.createInstance()
		translator.addTypes(sbvrTypes)
		return (vocab, rule, callback) ->
			Promise.try(->
				seModel = seModels[vocab]
				try
					lfModel = SBVRParser.matchAll(seModel + '\nRule: ' + rule, 'Process')
				catch e
					console.error('Error parsing rule', rule, e, e.stack)
					throw new Error(['Error parsing rule', rule, e])
				ruleLF = lfModel[lfModel.length-1]
				lfModel = lfModel[...-1]
				try
					slfModel = LF2AbstractSQL.LF2AbstractSQLPrep.match(lfModel, 'Process')
					slfModel.push(ruleLF)
					slfModel = LF2AbstractSQLPrepHack.match(slfModel, 'Process')

					translator.reset()
					abstractSqlModel = translator.match(slfModel, 'Process')
				catch e
					console.error('Error compiling rule', rule, e, e.stack)
					throw new Error(['Error compiling rule', rule, e])

				ruleAbs = abstractSqlModel.rules[-1..][0]
				# Remove the not exists
				ruleAbs[2][1] = ruleAbs[2][1][1][1]
				# Select all
				ruleAbs[2][1][1][1] = '*'
				ruleSQL = AbstractSQL2SQL.generate({tables: {}, rules: [ruleAbs]}).rules[0].sql

				db.transaction()
				.then((tx) ->
					tx.executeSql(ruleSQL.query, ruleSQL.bindings)
					.catch((err) ->
						tx.rollback()
						throw err
					).then((result) ->
						tx.end()
						return result
					)
				).then((result) ->
					resourceName = ruleLF[1][1][1][2][1].replace(/\ /g, '_').replace(/-/g, '__')
					clientModel = clientModels[vocab].resources
					processOData(vocab, clientModel, resourceName, result.rows)
					.then((d) ->
						return {
							__model: clientModel[resourceName]
							d: d
						}
					)
				)
			).nodeify(callback)

	exports.runURI = runURI = (method, uri, body = {}, tx, callback) ->
		if callback? and !_.isFunction(callback)
			message = 'Called runURI with a non-function callback?!'
			console.error(message)
			console.trace()
			return Promise.rejected(message)
		deferred = Promise.pending()
		console.log('Running', method, uri)
		req =
			user:
				permissions:
					'resource.all': true
			method: method
			url: uri
			body: body
		res =
			send: (statusCode) ->
				if statusCode >= 400
					deferred.reject(statusCode)
				else
					deferred.fulfill()
			json: (data, statusCode) ->
				if statusCode >= 400
					deferred.reject(data)
				else
					deferred.fulfill(data)
			set: ->
			type: ->

		next = (route) ->
			console.warn('Next called on a runURI?!', route)
			deferred.reject(501)

		switch method
			when 'GET'
				runGet(req, res, next, tx)
			when 'POST'
				runPost(req, res, next, tx)
			when 'PUT', 'PATCH', 'MERGE'
				runPut(req, res, next, tx)
			when 'DELETE'
				runDelete(req, res, next, tx)
		return deferred.promise.nodeify(callback)

	exports.runGet = runGet = uriParser.parseURITree (req, res, next, tx) ->
		res.set('Cache-Control', 'no-cache')
		tree = req.tree
		if tree.requests[0].query?
			request = tree.requests[0]
			try
				{query, bindings} = AbstractSQLCompiler.compile(db.engine, request.query)
			catch e
				console.error('Failed to compile abstract sql: ', request.query, e, e.stack)
				res.send(503)
				return
			getAndCheckBindValues(tree.vocabulary, bindings, request.values)
			.then((values) ->
				console.log(query, values)
				if tx?
					tx.executeSql(query, values)
				else
					db.transaction().then((tx) ->
						tx.executeSql(query, values)
						.then((result) ->
							tx.end()
							return result
						).catch((err) ->
							tx.rollback()
							throw err
						)
					)
			)
			.then((result) ->
				clientModel = clientModels[tree.vocabulary].resources
				switch tree.type
					when 'OData'
						processOData(tree.vocabulary, clientModel, request.resourceName, result.rows)
						.then((d) ->
							data =
								__model: clientModel[request.resourceName]
								d: d
							res.json(data)
						)
					else
						res.send(503)
			).catch((err) ->
				res.json(err, 404)
			)
		else
			if tree.requests[0].resourceName == '$metadata'
				res.type('xml')
				res.send(odataMetadata[tree.vocabulary])
			else
				clientModel = clientModels[tree.vocabulary]
				data =
					if tree.requests[0].resourceName == '$serviceroot'
						__model: clientModel.resources
					else
						__model: clientModel.resources[tree.requests[0].resourceName]
				res.json(data)

	exports.runPost = runPost = uriParser.parseURITree (req, res, next, tx) ->
		res.set('Cache-Control', 'no-cache')
		tree = req.tree
		request = tree.requests[0]
		try
			{query, bindings} = AbstractSQLCompiler.compile(db.engine, request.query)
		catch e
			console.error('Failed to compile abstract sql: ', request.query, e, e.stack)
			res.send(503)
			return
		vocab = tree.vocabulary
		getAndCheckBindValues(vocab, bindings, request.values)
		.then((values) ->
			console.log(query, values)
			runQuery = (tx) ->
				# TODO: Check for transaction locks.
				tx.executeSql(query, values)
				.catch((err) ->
					constraintError = checkForConstraintError(err, request.resourceName)
					if constraintError != false
						throw constraintError
					throw err
				).then((sqlResult) ->
					validateDB(tx, sqlModels[vocab])
					.then(->
						insertID = if request.query[0] == 'UpdateQuery' then values[0] else sqlResult.insertId
						console.log('Insert ID: ', insertID)
						res.json({
								id: insertID
							}, {
								location: '/' + vocab + '/' + request.resourceName + '?$filter=' + request.resourceName + '/' + clientModels[vocab].resources[request.resourceName].idField + ' eq ' + insertID
							}, 201
						)
					)
				)
			if tx?
				runQuery(tx)
			else
				db.transaction().then((tx) ->
					runQuery(tx)
					.then(->
						tx.end()
					).catch((err) ->
						tx.rollback()
						throw err
					)
				)
		).catch((err) ->
			res.json(err, 404)
		)

	exports.runPut = runPut = uriParser.parseURITree (req, res, next, tx) ->
		res.set('Cache-Control', 'no-cache')
		tree = req.tree
		request = tree.requests[0]
		try
			queries = AbstractSQLCompiler.compile(db.engine, request.query)
		catch e
			console.error('Failed to compile abstract sql: ', request.query, e, e.stack)
			res.send(503)
			return

		if _.isArray(queries)
			insertQuery = queries[0]
			updateQuery = queries[1]
		else
			insertQuery = queries

		vocab = tree.vocabulary
		id = getID(tree)
		runTransaction = (tx) ->
			tx.executeSql('''
				SELECT NOT EXISTS(
					SELECT 1
					FROM "resource" r
					JOIN "resource-is_under-lock" AS rl ON rl."resource" = r."id"
					WHERE r."resource type" = ?
					AND r."id" = ?
				) AS result;''', [request.resourceName, id])
			.catch((err) ->
				console.error('Unable to check resource locks', err, err.stack)
				throw new Error('Unable to check resource locks')
			).then((result) ->
				if result.rows.item(0).result in [false, 0, '0']
					throw new Error('The resource is locked and cannot be edited')

				runQuery = (query) ->
					getAndCheckBindValues(vocab, query.bindings, request.values)
					.then((values) ->
						tx.executeSql(query.query, values)
					)

				if updateQuery?
					runQuery(updateQuery)
					.then((result) ->
						if result.rowsAffected is 0
							runQuery(insertQuery)
					)
				else
					runQuery(insertQuery)
			).catch((err) ->
				constraintError = checkForConstraintError(err, request.resourceName)
				if constraintError != false
					throw constraintError
				throw err
			).then(->
				validateDB(tx, sqlModels[vocab])
			).then(->
				res.send(200)
			).catch((err) ->
				res.json(err, 404)
			)
		if tx?
			runTransaction(tx)
		else
			db.transaction().then((tx) ->
				runTransaction(tx)
				.then(->
					tx.end()
				).catch((err) ->
					tx.rollback()
					throw err
				)
			)

	exports.runDelete = runDelete = uriParser.parseURITree (req, res, next, tx) ->
		res.set('Cache-Control', 'no-cache')
		tree = req.tree
		request = tree.requests[0]
		try
			{query, bindings} = AbstractSQLCompiler.compile(db.engine, request.query)
		catch e
			console.error('Failed to compile abstract sql: ', request.query, e, e.stack)
			res.send(503)
			return
		vocab = tree.vocabulary
		getAndCheckBindValues(vocab, bindings, request.values)
		.then((values) ->
			console.log(query, values)
			runQuery = (tx) ->
				tx.executeSql(query, values)
				.catch((err) ->
					constraintError = checkForConstraintError(err, request.resourceName)
					if constraintError != false
						throw constraintError
					throw err
				).then(->
					validateDB(tx, sqlModels[vocab])
				)
			if tx?
				runQuery(tx)
			else
				db.transaction().then((tx) ->
					runQuery(tx)
					.then(->
						tx.end()
					).catch((err) ->
						tx.rollback()
						throw err
					)
				)
		).then(->
			res.send(200)
		).catch((err) ->
			res.json(err, 404)
		)

	exports.executeStandardModels = executeStandardModels = (tx, callback) ->
		# The dev model has to be executed first.
		executeModel(tx, 'dev', devModel)
		.then(->
			executeModels(tx, {
				'transaction': transactionModel
				'Auth': userModel
			})
		).then(->
			tx.executeSql('CREATE UNIQUE INDEX "uniq_model_model_type_vocab" ON "model" ("vocabulary", "model type");')
			.catch(->
				# Ignore errors creating the index, sadly not all databases we use support IF NOT EXISTS.
			)
			# TODO: Remove these hardcoded users.
			if has 'DEV'
				Promise.all([
					runURI('POST', '/Auth/user', {'username': 'guest', 'password': ' '})
					runURI('POST', '/Auth/user', {'username': 'test', 'password': 'test'})
					runURI('POST', '/Auth/permission', {'name': 'resource.all'})
				]).spread((guest, user, permission) ->
					Promise.all([
						runURI('POST', '/Auth/user__has__permission', {'user': guest.id, 'permission': permission.id})
						runURI('POST', '/Auth/user__has__permission', {'user': user.id, 'permission': permission.id})
						runURI('POST', '/Auth/api_key', {'user': user.id, 'key': 'test'})
						.then((apiKey) ->
							runURI('POST', '/Auth/api_key__has__permission', {'api_key': apiKey.id, 'permission': permission.id})
						)
					])
				).catch((err) ->
					console.error('Unable to add dev users', err, err.stack)
				)
			console.info('Sucessfully executed standard models.')
		).catch((err) ->
			console.error('Failed to execute standard models.', err, err.stack)
			throw err
		).nodeify(callback)

	exports.setup = (app, requirejs, _db, callback) ->
		db = _db
		AbstractSQL2SQL = AbstractSQL2SQL[db.engine]

		if has 'DEV'
			app.get('/dev/*', runGet)
		app.post '/transaction/execute', (req, res, next) ->
			id = Number(req.body.id)
			if _.isNaN(id)
				res.send(404)
			else
				endTransaction(id)
				.then(->
					res.send(200)
				).catch((err) ->
					console.error('Error ending transaction', err, err.stack)
					res.json(err, 404)
				)
		app.get '/transaction', (req, res, next) ->
			res.json(
				transactionURI: '/transaction/transaction'
				conditionalResourceURI: '/transaction/conditional_resource'
				conditionalFieldURI: '/transaction/conditional_field'
				lockURI: '/transaction/lock'
				transactionLockURI: '/transaction/lock__belongs_to__transaction'
				resourceURI: '/transaction/resource'
				lockResourceURI: '/transaction/resource__is_under__lock'
				exclusiveLockURI: '/transaction/lock__is_exclusive'
				commitTransactionURI: '/transaction/execute'
			)
		app.get('/transaction/*', runGet)
		app.post('/transaction/*', runPost)
		app.put('/transaction/*', runPut)
		app.del('/transaction/*', runDelete)

		db.transaction()
		.then((tx) ->
			executeStandardModels(tx)
			.then(->
				tx.end()
			).catch((err) ->
				tx.rollback()
				console.error('Could not execute standard models', err, err.stack)
				process.exit()
			)
		).nodeify(callback)

	return exports

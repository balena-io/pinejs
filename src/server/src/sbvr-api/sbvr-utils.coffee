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
	'cs!sbvr-api/transactions'
	'cs!sbvr-api/uri-parser'
	'resin-platform-api'
	'lodash'
	'bluebird'
	'typed-error'
	'sbvr-types'
	'text!sbvr-api/dev.sbvr'
	'text!sbvr-api/transaction.sbvr'
	'text!sbvr-api/user.sbvr'
], (exports, has, SBVRParser, LF2AbstractSQL, AbstractSQL2SQL, AbstractSQLCompiler, AbstractSQL2CLF, ODataMetadataGenerator, permissions, transactions, uriParser, resinPlatformAPI, _, Promise, TypedError, sbvrTypes, devModel, transactionModel, userModel) ->
	db = null

	exports.sbvrTypes = sbvrTypes

	fetchProcessing = _.mapValues sbvrTypes, ({fetchProcessing}) ->
		if fetchProcessing?
			Promise.promisify(fetchProcessing)

	LF2AbstractSQLTranslator = LF2AbstractSQL.createTranslator(sbvrTypes)

	seModels = {}
	sqlModels = {}
	clientModels = {}
	odataMetadata = {}

	apiHooks =
		GET: {}
		PUT: {}
		POST: {}
		PATCH: {}
		DELETE: {}
		OPTIONS: {}

	# Share hooks between merge and patch since they are the same operation, just MERGE was the OData intermediary until the HTTP spec added PATCH.
	apiHooks.MERGE = apiHooks.PATCH

	class UnsupportedMethodError extends TypedError
	class SqlCompilationError extends TypedError

	# TODO: Clean this up and move it into the db module.
	checkForConstraintError = do ->
		WEBSQL_CONSTRAINT_ERR = 6
		PG_UNIQUE_VIOLATION = '23505'
		PG_FOREIGN_KEY_VIOLATION = '23503'
		(err, tableName) ->
			if db.engine not in ['postgres', 'mysql']
				if err.code is WEBSQL_CONSTRAINT_ERR
					# SQLite
					return ['Constraint failed.']
				return false

			# Unique key
			switch db.engine
				when 'mysql'
					matches = /ER_DUP_ENTRY: Duplicate entry '.*?[^\\]' for key '(.*?[^\\])'/.exec(err)
				when 'postgres'
					if err.code is PG_UNIQUE_VIOLATION
						matches = new RegExp('"' + tableName + '_(.*?)_key"').exec(err)
						# We know it's the right error type, so if matches exists just return a generic error message, since we have failed to get the info for a more specific one.
						if !matches?
							return ['Unique key constraint violated']
			if matches?
				return ['"' + matches[1] + '" must be unique.']

			# Foreign Key
			switch db.engine
				when 'mysql'
					matches = /ER_ROW_IS_REFERENCED_: Cannot delete or update a parent row: a foreign key constraint fails \(".*?"\.(".*?").*/.exec(err)
				when 'postgres'
					if err.code is PG_FOREIGN_KEY_VIOLATION
						matches = new RegExp('"' + tableName + '" violates foreign key constraint ".*?" on table "(.*?)"').exec(err)
						matches ?= new RegExp('"' + tableName + '" violates foreign key constraint "' + tableName + '_(.*?)_fkey"').exec(err)
						# We know it's the right error type, so if matches exists just return a generic error message, since we have failed to get the info for a more specific one.
						if !matches?
							return ['Foreign key constraint violated']
			if matches?
				return ['Data is referenced by ' + matches[1].replace(/\ /g, '_').replace(/-/g, '__') + '.']
			return false

	getAndCheckBindValues = (vocab, bindings, values) ->
		mappings = clientModels[vocab].resourceToSQLMappings
		sqlModelTables = sqlModels[vocab].tables
		Promise.map bindings, (binding) ->
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
			.catch (err) ->
				throw new Error('"' + fieldName + '" ' + err)


	# TODO: Standardise on the validateModel name
	exports.validateModel = validateDB = (tx, modelName) ->
		Promise.map sqlModels[modelName].rules, (rule) ->
			tx.executeSql(rule.sql, rule.bindings)
			.then (result) ->
				if result.rows.item(0).result in [false, 0, '0']
					throw rule.structuredEnglish

	exports.executeModel = executeModel = (tx, model, callback) ->
		executeModels(tx, [model], callback)

	exports.executeModels = executeModels = (tx, models, callback) ->
		Promise.map models, (model) ->
			seModel = model.modelText
			vocab = model.apiRoot

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
			# Use `Promise.all _.map` in order to force sequential ordering, since the order the CREATE TABLE statements are run matters (eg. for foreign keys).
			Promise.all _.map sqlModel.createSchema, (createStatement) ->
				tx.executeSql(createStatement)
				.catch ->
					# Warning: We ignore errors in the create table statements as SQLite doesn't support CREATE IF NOT EXISTS
			.then ->
				seModels[vocab] = seModel
				sqlModels[vocab] = sqlModel
				clientModels[vocab] = clientModel
				odataMetadata[vocab] = metadata

				uriParser.addClientModel(vocab, clientModel)

				# Validate the [empty] model according to the rules.
				# This may eventually lead to entering obligatory data.
				# For the moment it blocks such models from execution.
				validateDB(tx, vocab)
			.then ->
				api[vocab] = new PlatformAPI('/' + vocab + '/')
				api[vocab].logger = {}
				for key, value of console
					if _.isFunction(value)
						if model.logging?[key] ? model.logging?.default ? true
							api[vocab].logger[key] = _.bind(value, console, vocab + ':')
						else
							api[vocab].logger[key] = ->
					else
						api[vocab].logger[key] = value

				return {
					vocab: vocab
					se: seModel
					lf: lfModel
					abstractsql: abstractSqlModel
					sql: sqlModel
					client: clientModel
				}
		# Only update the dev models once all models have finished executing.
		.map (model) ->
			updateModel = (modelType, modelText) ->
				api.dev.get(
					resource: 'model'
					options:
						select: 'id'
						filter:
							vocabulary: model.vocab
							model_type: modelType
					tx: tx
				)
				.then (result) ->
					method = 'POST'
					uri = '/dev/model'
					body =
						vocabulary: model.vocab
						model_value: modelText
						model_type: modelType
					id = result[0]?.id
					if id?
						uri += '(' + id + ')'
						method = 'PUT'
						body.id = id

					runURI(method, uri, body, tx)

			Promise.all([
				updateModel('se', model.se)
				updateModel('lf', model.lf)
				updateModel('abstractsql', model.abstractsql)
				updateModel('sql', model.sql)
				updateModel('client', model.client)
			])
		.catch (err) ->
			Promise.map models, (model) ->
				cleanupModel(model.apiRoot)
			throw err
		.nodeify(callback)

	cleanupModel = (vocab) ->
		delete seModels[vocab]
		delete sqlModels[vocab]
		delete clientModels[vocab]
		delete odataMetadata[vocab]
		uriParser.deleteClientModel(vocab)
		delete api[vocab]

	exports.deleteModel = (vocabulary, callback) ->
		db.transaction()
		.then (tx) ->
			dropStatements =
				_.map sqlModels[vocabulary]?.dropSchema, (dropStatement) ->
					tx.executeSql(dropStatement)
			Promise.all(dropStatements.concat([
				api.dev.delete(
					resource: 'model'
					options:
						filter:
							vocabulary: vocabulary
					tx: tx
				)
			])).then ->
				tx.end()
				cleanupModel(vocabulary)
			.catch (err) ->
				tx.rollback()
				throw err
		.nodeify(callback)

	exports.getID = (vocab, request) ->
		idField = sqlModels[vocab].tables[request.resourceName].idField
		for whereClause in request.abstractSqlQuery when whereClause[0] == 'Where'
			for comparison in whereClause[1..] when comparison[0] == 'Equals'
				if comparison[1][2] == idField
					return comparison[2][1]
				if comparison[2][2] == idField
					return comparison[1][1]
		return 0

	checkForExpansion = do ->
		rowsObjectHack = (i) -> @[i]
		Promise.method (vocab, clientModel, fieldName, instance) ->
			try
				field = JSON.parse(instance[fieldName])
			catch e
				# If we can't JSON.parse the field then it's not one needing expansion.
				return

			if _.isArray(field)
				# Hack to look like a rows object
				field.item = rowsObjectHack
				processOData(vocab, clientModel, fieldName, field)
				.then (expandedField) ->
					instance[fieldName] = expandedField
					return
			else if field?
				instance[fieldName] = {
					__deferred:
						uri: '/' + vocab + '/' + fieldName + '(' + field + ')'
					__id: field
				}
				return

	odataResourceURI = (vocab, resourceName, id) ->
		id =
			if _.isString(id)
				"'" + encodeURIComponent(id) + "'"
			else
				id
		return '/' + vocab + '/' + resourceName + '(' + id + ')'

	processOData = (vocab, clientModel, resourceName, rows) ->
		if rows.length is 0
			return Promise.fulfilled([])

		resourceModel = clientModel[resourceName]

		instances = rows.map (instance) ->
			instance.__metadata =
				uri: odataResourceURI(vocab, resourceModel.resourceName, + instance[resourceModel.idField])
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
							.then (result) ->
								instance[fieldName] = result
								return

		instancesPromise.then ->
			return instances

	exports.runRule = do ->
		LF2AbstractSQLPrepHack = LF2AbstractSQL.LF2AbstractSQLPrep._extend({CardinalityOptimisation: -> @_pred(false)})
		translator = LF2AbstractSQL.LF2AbstractSQL.createInstance()
		translator.addTypes(sbvrTypes)
		return (vocab, rule, callback) ->
			Promise.try ->
				seModel = seModels[vocab]
				{logger} = api[vocab]

				try
					lfModel = SBVRParser.matchAll(seModel + '\nRule: ' + rule, 'Process')
				catch e
					logger.error('Error parsing rule', rule, e, e.stack)
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
					logger.error('Error compiling rule', rule, e, e.stack)
					throw new Error(['Error compiling rule', rule, e])

				formulationType = ruleLF[1][0]
				resourceName =
					if ruleLF[1][1][0] == 'LogicalNegation'
						ruleLF[1][1][1][1][2][1]
					else
						ruleLF[1][1][1][2][1]

				fetchingViolators = false
				ruleAbs = abstractSqlModel.rules[-1..][0]
				if ruleAbs[2][1][0] == 'Not' and ruleAbs[2][1][1][0] == 'Exists' and ruleAbs[2][1][1][1][0] == 'SelectQuery'
					# Remove the not exists
					ruleAbs[2][1] = ruleAbs[2][1][1][1]
					fetchingViolators = true
				else if ruleAbs[2][1][0] == 'Exists' and ruleAbs[2][1][1][0] == 'SelectQuery'
					# Remove the exists
					ruleAbs[2][1] = ruleAbs[2][1][1]
				else
					throw new Error('Unsupported rule formulation')

				wantNonViolators = formulationType in ['PossibilityFormulation', 'PermissibilityFormulation']
				if wantNonViolators == fetchingViolators
					# What we want is the opposite of what we're getting, so add a not to the where clauses
					ruleAbs[2][1] = _.map ruleAbs[2][1], (queryPart) ->
						if queryPart[0] != 'Where'
							return queryPart
						if queryPart.length > 2
							throw new Error('Unsupported rule formulation')
						return ['Where', ['Not', queryPart[1]]]

				# Select all
				ruleAbs[2][1] = _.map ruleAbs[2][1], (queryPart) ->
					if queryPart[0] != 'Select'
						return queryPart
					return ['Select', '*']
				ruleSQL = AbstractSQL2SQL.generate({tables: {}, rules: [ruleAbs]}).rules[0].sql

				db.executeSql(ruleSQL.query, ruleSQL.bindings)
				.then (result) ->
					resourceName = resourceName.replace(/\ /g, '_').replace(/-/g, '__')
					clientModel = clientModels[vocab].resources[resourceName]
					ids = result.rows.map (row) -> row[clientModel.idField]
					ids = _.unique(ids)
					ids = _.map ids, (id) -> clientModel.idField + ' eq ' + id
					filter =
						if ids.length > 0
							ids.join(' or ')
						else
							'0 eq 1'
					runURI('GET', '/' + vocab + '/' + clientModel.resourceName + '?$filter=' + filter)
					.then (result) ->
						result.__formulationType = formulationType
						return result
			.nodeify(callback)

	exports.PlatformAPI =
		class PlatformAPI extends resinPlatformAPI(_, Promise)
			_request: ({method, url, body, tx, req}) ->
				return runURI(method, url, body, tx, req)

	exports.api = api = {}

	# We default to full permissions if no req object is passed in
	exports.runURI = runURI =  (method, uri, body = {}, tx, req, callback) ->
		if callback? and !_.isFunction(callback)
			message = 'Called runURI with a non-function callback?!'
			console.trace(message)
			return Promise.rejected(message)

		if _.isObject(req)
			user = req.user
		else
			if req?
				console.warn('Non-object req passed to runURI?', req, new Error().stack)
			user = permissions: ['resource.all']

		req =
			user: user
			method: method
			url: uri
			body: body
			tx: tx

		return new Promise (resolve, reject) ->
			res =
				send: (statusCode) ->
					if statusCode >= 400
						reject(statusCode)
					else
						resolve()
				json: (data, statusCode) ->
					if statusCode >= 400
						reject(data)
					else
						resolve(data)
				set: ->
				type: ->

			next = (route) ->
				console.warn('Next called on a runURI?!', method, uri, route)
				reject(500)

			handleODataRequest(req, res, next)
		.nodeify(callback)

	exports.handleODataRequest = handleODataRequest = (req, res, next) ->
		url = req.url.split('/')
		apiRoot = url[1]
		if !apiRoot? or !clientModels[apiRoot]?
			return next('route')

		api[apiRoot].logger.log('Parsing', req.method, req.url)
		# Parse the OData requests
		uriParser.parseODataURI(req)
		.then (requests) ->
			# Then for each request add/check the relevant permissions, translate to abstract sql, and then compile the abstract sql.
			Promise.map requests, (request) ->
				uriParser.addPermissions(req, request)
				.tap (request) ->
					req.hooks = apiHooks[request.method]?[request.vocabulary]?[request.resourceName] ? {}
					Promise.map req.hooks.POSTPARSE ? [], (hook) ->
						hook({req, request})
				.then(uriParser.translateUri)
				.then (request) ->
					if request.abstractSqlQuery?
						try
							request.sqlQuery = AbstractSQLCompiler.compile(db.engine, request.abstractSqlQuery)
						catch err
							logger.error('Failed to compile abstract sql: ', request.abstractSqlQuery, err, err.stack)
							throw new SqlCompilationError(err)
					return request
		# Then handle forwarding the request to the correct method handler.
		.then (requests) ->
			# Use the first request (and only, since we don't support multiple requests in one yet)
			request = requests[0]
			{logger} = api[request.vocabulary]

			res.set('Cache-Control', 'no-cache')
			logger.log('Running', req.method, req.url)

			runTransaction req, request, (tx) ->
				Promise.map req.hooks.PRERUN ? [], (hook) ->
					hook({req, request, tx})
				.then ->
					switch req.method
						when 'GET'
							runGet(req, res, request, tx)
						when 'POST'
							runPost(req, res, request, tx)
						when 'PUT', 'PATCH', 'MERGE'
							runPut(req, res, request, tx)
						when 'DELETE'
							runDelete(req, res, request, tx)
			.then (result) ->
				switch req.method
					when 'GET'
						respondGet(req, res, request, result)
					when 'POST'
						respondPost(req, res, request, result)
					when 'PUT', 'PATCH', 'MERGE'
						respondPut(req, res, request, result)
					when 'DELETE'
						respondDelete(req, res, request, result)
					when 'OPTIONS'
						respondOptions(req, res, request, result)
					else
						throw new UnsupportedMethodError()
			.catch db.DatabaseError, (err) ->
				constraintError = checkForConstraintError(err, request.resourceName)
				if constraintError != false
					throw constraintError
				logger.error(err, err.stack)
				res.send(500)
			.catch EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, (err) ->
				logger.error(err, err.stack)
				res.send(500)
		.catch uriParser.PermissionError, (err) ->
			res.send(401)
		.catch SqlCompilationError, uriParser.TranslationError, uriParser.ParsingError, (err) ->
			res.send(500)
		.catch UnsupportedMethodError, (err) ->
			res.send(405)
		.catch (err) ->
			# If the err is an error object then use its message instead - it should be more readable!
			if err instanceof Error
				err = err.message
			res.json(err, 404)

	# This is a helper method to handle using a passed in req.tx when available, or otherwise creating a new tx and cleaning up after we're done.
	runTransaction = (req, request, callback) ->
		runCallback = (tx) ->
			callback(tx)
			.tap (result) ->
				Promise.map req.hooks.POSTRUN ? [], (hook) ->
					hook({req, request, result, tx})
		if req.tx?
			# If an existing tx was passed in then use it.
			runCallback(req.tx)
		else
			# Otherwise create a new transaction and handle tidying it up.
			db.transaction().then (tx) ->
				runCallback(tx)
				.tap ->
					tx.end()
				.catch (err) ->
					tx.rollback()
					throw err

	# This is a helper function that will check and add the bind values to the SQL query and then run it.
	runQuery = (tx, request, queryIndex, addReturning) ->
		{values, sqlQuery, vocabulary} = request
		if queryIndex?
			sqlQuery = sqlQuery[queryIndex]
		getAndCheckBindValues(vocabulary, sqlQuery.bindings, values)
		.then (values) ->
			api[vocabulary].logger.log(sqlQuery.query, values)
			sqlQuery.values = values
			tx.executeSql(sqlQuery.query, values, null, addReturning)

	runGet = (req, res, request, tx) ->
		vocab = request.vocabulary
		if request.sqlQuery?
			runQuery(tx, request)

	respondGet = (req, res, request, result) ->
		vocab = request.vocabulary
		if request.sqlQuery?
			clientModel = clientModels[vocab].resources
			processOData(vocab, clientModel, request.resourceName, result.rows)
			.then (d) ->
				res.json(
					__model: clientModel[request.resourceName]
					d: d
				)
		else
			if request.resourceName == '$metadata'
				res.type('xml')
				res.send(odataMetadata[vocab])
			else
				clientModel = clientModels[vocab]
				data =
					if request.resourceName == '$serviceroot'
						__model: clientModel.resources
					else
						__model: clientModel.resources[request.resourceName]
				res.json(data)
			return Promise.resolve()

	runPost = (req, res, request, tx) ->
		vocab = request.vocabulary

		idField = clientModels[vocab].resources[request.resourceName].idField

		# TODO: Check for transaction locks.
		runQuery(tx, request, null, idField)
		.then (sqlResult) ->
			validateDB(tx, vocab)
			.then ->
				# Return the inserted/updated id.
				if request.abstractSqlQuery[0] == 'UpdateQuery'
					request.sqlQuery.values[0]
				else
					sqlResult.insertId

	respondPost = (req, res, request, result) ->
		vocab = request.vocabulary
		id = result
		location = odataResourceURI(vocab, request.resourceName, id)
		api[vocab].logger.log('Insert ID: ', request.resourceName, id)
		runURI('GET', location)
		.then (result) ->
			res.set('Location', location)
			res.json(result, 201)

	runPut = (req, res, request, tx) ->
		vocab = request.vocabulary

		transactions.check(tx, request)
		.then ->
			# If request.sqlQuery is an array it means it's an UPSERT, ie two queries: [InsertQuery, UpdateQuery]
			if _.isArray(request.sqlQuery)
				# Run the update query first
				runQuery(tx, request, 1)
				.then (result) ->
					if result.rowsAffected is 0
						# Then run the insert query if nothing was updated
						runQuery(tx, request, 0)
			else
				runQuery(tx, request)
		.then ->
			validateDB(tx, vocab)

	respondPut = respondDelete = respondOptions = (req, res) ->
		res.send(200)

	runDelete = (req, res, request, tx) ->
		vocab = request.vocabulary

		runQuery(tx, request)
		.then ->
			validateDB(tx, vocab)

	exports.executeStandardModels = executeStandardModels = (tx, callback) ->
		# The dev model has to be executed first.
		executeModel(tx,
			apiRoot: 'dev'
			modelText: devModel
		)
		.then ->
			executeModels(tx, [
				apiRoot: 'transaction'
				modelText: transactionModel
			,
				apiRoot: 'Auth'
				modelText: userModel
			])
		.then ->
			tx.executeSql('CREATE UNIQUE INDEX "uniq_model_model_type_vocab" ON "model" ("vocabulary", "model type");')
			.catch ->
				# Ignore errors creating the index, sadly not all databases we use support IF NOT EXISTS.
			# TODO: Remove these hardcoded users.
			if has 'DEV'
				authAPI = api.Auth
				Promise.all([
					authAPI.post(
						resource: 'user'
						body: 
							username: 'guest'
							password: ' '
					)
					authAPI.post(
						resource: 'user'
						body:
							username: 'test'
							password: 'test'
					)
					authAPI.post(
						resource: 'permission'
						body:
							name: 'resource.all'
					)
				]).spread (guest, user, permission) ->
					Promise.all([
						authAPI.post(
							resource: 'user__has__permission'
							body:
								user: guest.id
								permission: permission.id
						)
						authAPI.post(
							resource: 'user__has__permission'
							body:
								user: user.id
								permission: permission.id
						)
						authAPI.post(
							resource: 'api_key'
							body:
								user: user.id
								key: 'test'
						).then (apiKey) ->
							authAPI.post(
								resource: 'api_key__has__permission'
								body:
									api_key: apiKey.id
									permission: permission.id
							)
					])
				.catch (err) ->
					authAPI.logger.error('Unable to add dev users', err, err.stack)
			console.info('Sucessfully executed standard models.')
		.catch (err) ->
			console.error('Failed to execute standard models.', err, err.stack)
			throw err
		.nodeify(callback)

	exports.addHook = (method, apiRoot, resourceName, callbacks) ->
		methodHooks = apiHooks[method]
		if !methodHooks?
			throw new Error('Unsupported method: ' + method)
		if !clientModels[apiRoot]?
			throw new Error('Unknown api root: ' + apiRoot)
		if !clientModels[apiRoot].resources[resourceName]?
			throw new Error('Unknown resource for api root: ' + resourceName + ', ' + apiRoot)

		for callbackType, callback of callbacks when callbackType not in ['POSTPARSE', 'PRERUN', 'POSTRUN']
			throw new Error('Unknown callback type: ' + callbackType)

		apiRootHooks = methodHooks[apiRoot] ?= {}
		resourceHooks = apiRootHooks[resourceName] ?= {}

		for callbackType, callback of callbacks
			resourceHooks[callbackType] ?= []
			resourceHooks[callbackType].push(callback)

	exports.setup = (app, requirejs, _db, callback) ->
		exports.db = db = _db
		AbstractSQL2SQL = AbstractSQL2SQL[db.engine]

		if has 'DEV'
			app.get('/dev/*', handleODataRequest)

		permissions.setup(app, requirejs, exports)
		_.extend(exports, permissions)
		transactions.setup(app, requirejs, exports)

		db.transaction()
		.then (tx) ->
			executeStandardModels(tx)
			.then ->
				tx.end()
			.catch (err) ->
				tx.rollback()
				console.error('Could not execute standard models', err, err.stack)
				process.exit()
		.nodeify(callback)

	return

_ = require 'lodash'
Promise = require 'bluebird'
TypedError = require 'typed-error'
LF2AbstractSQL = require '@resin/lf-to-abstract-sql'
AbstractSQLCompiler = require '@resin/abstract-sql-compiler'
PinejsClientCore = require 'pinejs-client/core'
sbvrTypes = require '@resin/sbvr-types'

SBVRParser = require '../extended-sbvr-parser/extended-sbvr-parser'

migrator = require '../migrator/migrator'
AbstractSQL2CLF = require '@resin/abstract-sql-to-odata-schema'
ODataMetadataGenerator = require '../sbvr-compiler/ODataMetadataGenerator'

devModel = require './dev.sbvr'
permissions = require './permissions'
uriParser = require './uri-parser'

controlFlow = require './control-flow'
memoize = require 'memoizee'
memoizedCompileRule = memoize(
	(abstractSqlQuery) ->
		AbstractSQLCompiler.compileRule(abstractSqlQuery)
	primitive: true
)

db = null

exports.sbvrTypes = sbvrTypes

fetchProcessing = _.mapValues sbvrTypes, ({ fetchProcessing }) ->
	if fetchProcessing?
		Promise.promisify(fetchProcessing)

LF2AbstractSQLTranslator = LF2AbstractSQL.createTranslator(sbvrTypes)

seModels = {}
sqlModels = {}
clientModels = {}
odataMetadata = {}

apiHooks =
	all: {}
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
class SbvrValidationError extends TypedError
class InternalRequestError extends TypedError

# TODO: Clean this up and move it into the db module.
prettifyConstraintError = (err, tableName) ->
	if err instanceof db.ConstraintError
		if err instanceof db.UniqueConstraintError
			switch db.engine
				when 'mysql'
					matches = /ER_DUP_ENTRY: Duplicate entry '.*?[^\\]' for key '(.*?[^\\])'/.exec(err)
				when 'postgres'
					matches = new RegExp('"' + tableName + '_(.*?)_key"').exec(err)
					# We know it's the right error type, so if matches exists just throw a generic error message, since we have failed to get the info for a more specific one.
					if !matches?
						throw new db.UniqueConstraintError('Unique key constraint violated')
			throw new db.UniqueConstraintError('"' + matches[1] + '" must be unique.'.replace(/-/g, '__') + '.')

		if err instanceof db.ForeignKeyConstraintError
			switch db.engine
				when 'mysql'
					matches = /ER_ROW_IS_REFERENCED_: Cannot delete or update a parent row: a foreign key constraint fails \(".*?"\.(".*?").*/.exec(err)
				when 'postgres'
					matches = new RegExp('"' + tableName + '" violates foreign key constraint ".*?" on table "(.*?)"').exec(err)
					matches ?= new RegExp('"' + tableName + '" violates foreign key constraint "' + tableName + '_(.*?)_fkey"').exec(err)
					# We know it's the right error type, so if matches exists just throw a generic error message, since we have failed to get the info for a more specific one.
					if !matches?
						throw new db.ForeignKeyConstraintError('Foreign key constraint violated')
			throw new db.ForeignKeyConstraintError('Data is referenced by ' + matches[1].replace(/\ /g, '_').replace(/-/g, '__') + '.')

		throw err

exports.resolveOdataBind = resolveOdataBind = (odataBinds, value) ->
	if _.isObject(value) and value.bind?
		[dataType, value] = odataBinds[value.bind]
	return value

getAndCheckBindValues = (vocab, odataBinds, bindings, values) ->
	mappings = clientModels[vocab].resourceToSQLMappings
	sqlModelTables = sqlModels[vocab].tables
	Promise.map bindings, (binding) ->
		if binding[0] is 'Bind'
			if _.isArray(binding[1])
				[tableName, fieldName] = binding[1]

				referencedName = tableName + '.' + fieldName
				value = values[referencedName]
				if value is undefined
					value = values[fieldName]

				value = resolveOdataBind(odataBinds, value)

				[mappedTableName, mappedFieldName] = mappings[tableName][fieldName]
				field = _.find(sqlModelTables[mappedTableName].fields, {
					fieldName: mappedFieldName
				})
			else if _.isInteger(binding[1])
				if binding[1] >= odataBinds.length
					console.error("Invalid binding number '#{binding[1]}' for binds: ", odataBinds)
					throw new Error('Invalid binding')
				[dataType, value] = odataBinds[binding[1]]
				field = { dataType }
			else
				throw new Error("Unknown binding: #{binding}")
		else
			[dataType, value] = binding
			field = { dataType }

		if value is undefined
			return db.DEFAULT_VALUE

		AbstractSQLCompiler.dataTypeValidate(value, field)
		.catch (e) ->
			e.message = '"' + fieldName + '" ' + e.message
			throw e

isRuleAffected = do ->
	checkModifiedFields = (referencedFields, modifiedFields) ->
		refs = referencedFields[modifiedFields.table]
		# If there are no referenced fields of the modified table then the rule is not affected
		if not refs?
			return false
		# If there are no specific fields listed then that means they were all modified (ie insert/delete) and so the rule can be affected
		if not modifiedFields.fields?
			return true
		# Otherwise check if there are any matching fields to see if the rule is affected
		return _.intersection(refs, modifiedFields.fields).length > 0

	return (rule, request) ->
		# If there is no abstract sql query then nothing was modified
		if not request?.abstractSqlQuery?
			return false
		# If for some reason there are no referenced fields known for the rule then we just assume it may have been modified
		if not rule.referencedFields?
			return true
		modifiedFields = AbstractSQLCompiler.getModifiedFields(request.abstractSqlQuery)
		# If we can't get any modified fields we assume the rule may have been modified
		if not modifiedFields?
			console.warn("Could not determine the modified table/fields info for '#{request.method}' to #{request.vocabulary}", request.abstractSqlQuery)
			return true
		if _.isArray(modifiedFields)
			return _.any(modifiedFields, _.partial(checkModifiedFields, rule.referencedFields))
		return checkModifiedFields(rule.referencedFields, modifiedFields)


exports.validateModel = validateModel = (tx, modelName, request) ->
	Promise.map sqlModels[modelName].rules, (rule) ->
		if not isRuleAffected(rule, request)
			# If none of the fields intersect we don't need to run the rule! :D
			return

		tx.executeSql(rule.sql, rule.bindings)
		.then (result) ->
			if result.rows.item(0).result in [false, 0, '0']
				throw new SbvrValidationError(rule.structuredEnglish)

exports.executeModel = executeModel = (tx, model, callback) ->
	executeModels(tx, [model], callback)

exports.executeModels = executeModels = (tx, models, callback) ->
	Promise.map models, (model) ->
		seModel = model.modelText
		vocab = model.apiRoot

		migrator.run(tx, model).then ->
			try
				lfModel = SBVRParser.matchAll(seModel, 'Process')
			catch e
				console.error('Error parsing model', vocab, e, e.stack)
				throw new Error(['Error parsing model', e])

			try
				abstractSqlModel = LF2AbstractSQLTranslator(lfModel, 'Process')
				sqlModel = AbstractSQLCompiler.compileSchema(abstractSqlModel)
				clientModel = AbstractSQL2CLF(sqlModel)
				metadata = ODataMetadataGenerator(vocab, sqlModel)
			catch e
				console.error('Error compiling model', vocab, e, e.stack)
				throw new Error(['Error compiling model', e])

			# Create tables related to terms and fact types
			# Use `Promise.reduce` to run statements sequentially, as the order of the CREATE TABLE statements matters (eg. for foreign keys).
			Promise.reduce sqlModel.createSchema, (arr, createStatement) ->
				tx.executeSql(createStatement)
				.catch ->
					# Warning: We ignore errors in the create table statements as SQLite doesn't support CREATE IF NOT EXISTS
			, []
			.then ->
				seModels[vocab] = seModel
				sqlModels[vocab] = sqlModel
				clientModels[vocab] = clientModel
				odataMetadata[vocab] = metadata

				uriParser.addClientModel(vocab, clientModel)

				# Validate the [empty] model according to the rules.
				# This may eventually lead to entering obligatory data.
				# For the moment it blocks such models from execution.
				validateModel(tx, vocab)
			.then ->
				api[vocab] = new PinejsClient('/' + vocab + '/')
				api[vocab].logger = {}
				for key, value of console
					if _.isFunction(value)
						if model.logging?[key] ? model.logging?.default ? true
							api[vocab].logger[key] = do (key) ->
								return ->
									console[key](vocab + ':', arguments...)
						else
							api[vocab].logger[key] = _.noop
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
			api.dev.get
				resource: 'model'
				passthrough:
					tx: tx
					req: permissions.rootRead
				options:
					select: 'id'
					filter:
						vocabulary: model.vocab
						model_type: modelType
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
					method = 'PATCH'
					body.id = id

				runURI(method, uri, body, tx, permissions.root)

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

getHooks = do ->
	mergeHooks = (a, b) ->
		_.mergeWith {}, a, b, (a, b) ->
			if _.isArray(a)
				return a.concat(b)
	getResourceHooks = (vocabHooks, request) ->
		return {} if !vocabHooks?
		# When getting the hooks list for the sake of PREPARSE hooks
		# we don't know the resourceName we'll be acting on yet
		if !request.resourceName?
			return vocabHooks['all']
		mergeHooks(
			vocabHooks[request.resourceName]
			vocabHooks['all']
		)
	getVocabHooks = (methodHooks, request) ->
		return {} if !methodHooks?
		mergeHooks(
			getResourceHooks(methodHooks[request.vocabulary], request)
			getResourceHooks(methodHooks['all'], request)
		)
	return getMethodHooks = (request) ->
		mergeHooks(
			getVocabHooks(apiHooks[request.method], request)
			getVocabHooks(apiHooks['all'], request)
		)

runHook = (hookName, args) ->
	Object.defineProperty args, 'api',
		get: _.once ->
			return api[args.request.vocabulary].clone(passthrough: _.pick(args, 'req', 'tx'))
	hooks = args.req.hooks[hookName] || []
	Promise.map hooks, (hook) ->
		hook(args)

exports.deleteModel = (vocabulary, callback) ->
	db.transaction()
	.then (tx) ->
		dropStatements =
			_.map sqlModels[vocabulary]?.dropSchema, (dropStatement) ->
				tx.executeSql(dropStatement)
		Promise.all(dropStatements.concat([
			api.dev.delete
				resource: 'model'
				passthrough:
					tx: tx
					req: permissions.root
				options:
					filter:
						vocabulary: vocabulary
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
		catch
			# If we can't JSON.parse the field then we use it directly.
			field = instance[fieldName]

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

processOData = do ->
	getLocalFields = (resourceModel) ->
		if !resourceModel.localFields?
			resourceModel.localFields = {}
			for { fieldName, dataType } in resourceModel.fields when dataType isnt 'ForeignKey'
				resourceModel.localFields[fieldName.replace(/\ /g, '_')] = true
		return resourceModel.localFields
	getFetchProcessingFields = (resourceModel) ->
		return resourceModel.fetchProcessingFields ?=
			_(resourceModel.fields)
			.filter(({ dataType }) -> fetchProcessing[dataType]?)
			.map ({ fieldName, dataType }) ->
				return [
					fieldName.replace(/\ /g, '_')
					fetchProcessing[dataType]
				]
			.fromPairs()
			.value()

	return (vocab, clientModel, resourceName, rows) ->
		if rows.length is 0
			return Promise.fulfilled([])

		if rows.length is 1
			if rows.item(0).$count?
				count = parseInt(rows.item(0).$count, 10)
				return Promise.fulfilled(count)

		resourceModel = clientModel[resourceName]

		instances = rows.map (instance) ->
			instance.__metadata =
				uri: odataResourceURI(vocab, resourceModel.resourceName, +instance[resourceModel.idField])
				type: ''
			return instance

		instancesPromise = Promise.fulfilled()

		localFields = getLocalFields(resourceModel)
		# We check that it's not a local field, rather than that it is a foreign key because of the case where the foreign key is on the other resource
		# and hence not known to this resource
		expandableFields = _.filter(_.keys(instances[0]), (fieldName) -> fieldName[0..1] != '__' and !localFields.hasOwnProperty(fieldName))
		if expandableFields.length > 0
			instancesPromise = Promise.map instances, (instance) ->
				Promise.map expandableFields, (fieldName) ->
					checkForExpansion(vocab, clientModel, fieldName, instance)

		fetchProcessingFields = getFetchProcessingFields(resourceModel)
		processedFields = _.filter(_.keys(instances[0]), (fieldName) -> fieldName[0..1] != '__' and fetchProcessingFields.hasOwnProperty(fieldName))
		if processedFields.length > 0
			instancesPromise = instancesPromise.then ->
				Promise.map instances, (instance) ->
					Promise.map processedFields, (resourceName) ->
						fetchProcessingFields[resourceName](instance[resourceName])
						.then (result) ->
							instance[resourceName] = result
							return

		instancesPromise.then ->
			return instances

exports.runRule = do ->
	LF2AbstractSQLPrepHack = LF2AbstractSQL.LF2AbstractSQLPrep._extend({ CardinalityOptimisation: -> @_pred(false) })
	translator = LF2AbstractSQL.LF2AbstractSQL.createInstance()
	translator.addTypes(sbvrTypes)
	return (vocab, rule, callback) ->
		Promise.try ->
			seModel = seModels[vocab]
			{ logger } = api[vocab]

			try
				lfModel = SBVRParser.matchAll(seModel + '\nRule: ' + rule, 'Process')
			catch e
				logger.error('Error parsing rule', rule, e, e.stack)
				throw new Error(['Error parsing rule', rule, e])

			ruleLF = lfModel[lfModel.length - 1]
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
			ruleBody = _.find(ruleAbs, 0: 'Body')
			if ruleBody[1][0] == 'Not' and ruleBody[1][1][0] == 'Exists' and ruleBody[1][1][1][0] == 'SelectQuery'
				# Remove the not exists
				ruleBody[1] = ruleBody[1][1][1]
				fetchingViolators = true
			else if ruleBody[1][0] == 'Exists' and ruleBody[1][1][0] == 'SelectQuery'
				# Remove the exists
				ruleBody[1] = ruleBody[1][1]
			else
				throw new Error('Unsupported rule formulation')

			wantNonViolators = formulationType in ['PossibilityFormulation', 'PermissibilityFormulation']
			if wantNonViolators == fetchingViolators
				# What we want is the opposite of what we're getting, so add a not to the where clauses
				ruleBody[1] = _.map ruleBody[1], (queryPart) ->
					if queryPart[0] != 'Where'
						return queryPart
					if queryPart.length > 2
						throw new Error('Unsupported rule formulation')
					return ['Where', ['Not', queryPart[1]]]

			# Select all
			ruleBody[1] = _.map ruleBody[1], (queryPart) ->
				if queryPart[0] != 'Select'
					return queryPart
				return ['Select', '*']
			ruleSQL = AbstractSQLCompiler.compileRule(ruleBody)

			db.executeSql(ruleSQL.query, ruleSQL.bindings)
			.then (result) ->
				resourceName = resourceName.replace(/\ /g, '_').replace(/-/g, '__')
				clientModel = clientModels[vocab].resources[resourceName]
				ids = result.rows.map (row) -> row[clientModel.idField]
				ids = _.uniq(ids)
				ids = _.map ids, (id) -> clientModel.idField + ' eq ' + id
				filter =
					if ids.length > 0
						ids.join(' or ')
					else
						'0 eq 1'
				runURI('GET', '/' + vocab + '/' + clientModel.resourceName + '?$filter=' + filter, null, null, permissions.rootRead)
				.then (result) ->
					result.__formulationType = formulationType
					result.__resourceName = resourceName
					return result
		.nodeify(callback)

exports.PinejsClient =
	class PinejsClient extends PinejsClientCore(_, Promise)
		_request: ({ method, url, body, tx, req, custom }) ->
			return runURI(method, url, body, tx, req, custom)

exports.api = api = {}

# We default to full permissions if no req object is passed in
exports.runURI = runURI =  (method, uri, body = {}, tx, req, custom, callback) ->
	if callback? and !_.isFunction(callback)
		message = 'Called runURI with a non-function callback?!'
		console.trace(message)
		return Promise.rejected(message)

	if _.isObject(req)
		user = req.user
		apiKey = req.apiKey
	else
		if req?
			console.warn('Non-object req passed to runURI?', req, new Error().stack)
		user = permissions: []

	req =
		custom: custom
		user: user
		apiKey: apiKey
		method: method
		url: uri
		body: body
		params: {}
		query: {}
		tx: tx

	return new Promise (resolve, reject) ->
		res =
			statusCode: 200
			status: (@statusCode) ->
				return this
			sendStatus: (statusCode) ->
				if statusCode >= 400
					reject(statusCode)
				else
					resolve()
			send: (statusCode = @statusCode) ->
				@sendStatus(statusCode)
			json: (data, statusCode = @statusCode) ->
				if statusCode >= 400
					reject(data)
				else
					resolve(data)
			set: ->
			type: ->

		next = (route) ->
			console.warn('Next called on a runURI?!', method, uri, route)
			res.sendStatus(500)

		handleODataRequest(req, res, next)
	.nodeify(callback)

exports.handleODataRequest = handleODataRequest = (req, res, next) ->
	url = req.url.split('/')
	apiRoot = url[1]
	if !apiRoot? or !clientModels[apiRoot]?
		return next('route')

	if process.env.DEBUG
		api[apiRoot].logger.log('Parsing', req.method, req.url)

	{ mapPar, mapSeries } = controlFlow.getMappingFn(req.headers)
	# Get the hooks for the current method/vocabulary as we know it,
	# in order to run PREPARSE hooks, before parsing gets us more info
	req.hooks = getHooks(
		method: req.method
		vocabulary: apiRoot
	)
	runHook('PREPARSE', { req, tx: req.tx })
	.then ->
		{ method, url, body } = req

		# Check if it is a single request or a batch
		body = if req.batch?.length > 0 then req.batch else [{ method: method, url: url, data: body }]
		# Parse the OData requests
		mapSeries body, (bodypart) ->
			uriParser.parseOData(bodypart)
			.then controlFlow.liftP (request) ->
				# Get the full hooks list now that we can
				req.hooks = getHooks(request)
				# Add/check the relevant permissions
				runHook('POSTPARSE', { req, request, tx: req.tx })
				.return(request)
				.then (uriParser.translateUri)
				.then (request) ->
					# We defer compilation of abstract sql queries with references to other requests
					if request.abstractSqlQuery? && !request._defer
						try
							request.sqlQuery = memoizedCompileRule(request.abstractSqlQuery)
						catch err
							api[apiRoot].logger.error('Failed to compile abstract sql: ', request.abstractSqlQuery, err, err.stack)
							throw new SqlCompilationError(err)
					return request

			.then (request) ->
				# Run the request in its own transaction
				runTransaction req, request, (tx) ->
					if _.isArray request
						env = new Map()
						Promise.reduce(request, runChangeSet(req, res, tx), env)
						.then (env) -> Array.from(env.values())
					else
						runRequest(req, res, tx, request)
	.then (results) ->
		mapSeries results, (result) ->
			if _.isError(result)
				return constructError(result)
			else
				return result
	.then (responses) ->
		res.set('Cache-Control', 'no-cache')
		# If we are dealing with a single request unpack the response and respond normally
		if not req.batch?.length > 0

			response = responses[0]
			if response.status then res.status(response.status)
			_.forEach response.headers, (headerValue, headerName) ->
				res.set(headerName, headerValue)

			if not response.body
				res.sendStatus(response.status)
			else
				res.json(response.body)
		# Otherwise its a multipart request and we reply with the appropriate multipart response
		else
			res.status(200).sendMulti(responses)
	# If an error bubbles here it must have happened in the last then block
	# We just respond with 500 as there is probably not much we can do to recover
	.catch (e) ->
		console.error('An error occured while constructing the response', e, e.stack)
		res.sendStatus(500)

# Reject the error to use the nice catch syntax
constructError = (e) ->
	Promise.reject(e)
	.catch SbvrValidationError, (err) ->
		{ status: 400, body: err.message }
	.catch uriParser.BadRequestError, ->
		{ status: 400 }
	.catch permissions.PermissionError, (err) ->
		{ status: 401 }
	.catch SqlCompilationError, uriParser.TranslationError, uriParser.ParsingError, permissions.PermissionParsingError, InternalRequestError, (err) ->
		{ status: 500 }
	.catch UnsupportedMethodError, (err) ->
		{ status: 405 }
	.catch e, (err) ->
		# If the err is an error object then use its message instead - it should be more readable!
		if _.isError err
			err = err.message
		{ status: 404, body: err }

runRequest = (req, res, tx, request) ->
	{ logger } = api[request.vocabulary]

	if process.env.DEBUG
		logger.log('Running', req.method, req.url)
	# Forward each request to the correct method handler
	runHook('PRERUN', { req, request, tx })
	.then ->
		switch request.method
			when 'GET'
				runGet(req, res, request, tx)
			when 'POST'
				runPost(req, res, request, tx)
			when 'PUT', 'PATCH', 'MERGE'
				runPut(req, res, request, tx)
			when 'DELETE'
				runDelete(req, res, request, tx)
	.catch db.DatabaseError, (err) ->
		prettifyConstraintError(err, request.resourceName)
		logger.error(err, err.stack)
		throw err
	.catch EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, (err) ->
		logger.error(err, err.stack)
		throw new InternalRequestError()
	.tap (result) ->
		runHook('POSTRUN', { req, request, result, tx })
	.then (result) ->
		prepareResponse(req, res, request, result, tx)

runChangeSet = (req, res, tx) ->
	(env, request) ->
		request = updateBinds(env, request)
		runRequest(req, res, tx, request)
		.then (result) ->
			result.headers['Content-Id'] = request.id
			env.set(request.id, result)
			return env

# Requests inside a changeset may refer to resources created inside the
# changeset, the generation of the sql query for those requests must be
# deferred untill the request they reference is run and returns an insert ID.
# This function compiles the sql query of a request which has been deferred
updateBinds = (env, request) ->
	if request._defer
		request.odataBinds = _.map request.odataBinds, ([tag, id]) ->
			if tag == 'ContentReference'
				ref = env.get(id)
				if _.isUndefined(ref?.body?.id)
					throw uriParser.BadRequestError('Reference to a non existing resource in Changeset')
				else
					uriParser.parseId(ref.body.id)
			else
				[tag, id]
		request.sqlQuery = memoizedCompileRule(request.abstractSqlQuery)
	return request

prepareResponse = (req, res, request, result, tx) ->
	Promise.try ->
		switch request.method
			when 'GET'
				respondGet(req, res, request, result, tx)
			when 'POST'
				respondPost(req, res, request, result, tx)
			when 'PUT', 'PATCH', 'MERGE'
				respondPut(req, res, request, result, tx)
			when 'DELETE'
				respondDelete(req, res, request, result, tx)
			when 'OPTIONS'
				respondOptions(req, res, request, result, tx)
			else
				throw new UnsupportedMethodError()

# This is a helper method to handle using a passed in req.tx when available, or otherwise creating a new tx and cleaning up after we're done.
runTransaction = (req, request, callback) ->
	runCallback = (tx) ->
		callback(tx)
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
	{ values, odataBinds, sqlQuery, vocabulary } = request
	if queryIndex?
		sqlQuery = sqlQuery[queryIndex]
	getAndCheckBindValues(vocabulary, odataBinds, sqlQuery.bindings, values)
	.then (values) ->
		if process.env.DEBUG
			api[vocabulary].logger.log(sqlQuery.query, values)

		sqlQuery.values = values
		tx.executeSql(sqlQuery.query, values, null, addReturning)

runGet = (req, res, request, tx) ->
	if request.sqlQuery?
		runQuery(tx, request)

respondGet = (req, res, request, result, tx) ->
	vocab = request.vocabulary
	if request.sqlQuery?
		clientModel = clientModels[vocab].resources
		processOData(vocab, clientModel, request.resourceName, result.rows)
		.then (d) ->
			runHook('PRERESPOND', { req, res, request, result, data: d, tx: tx })
			.then ->
				{ body: { d }, headers: { contentType: 'application/json' } }
	else
		if request.resourceName == '$metadata'
			return { body: odataMetadata[vocab], headers: { contentType: 'xml' } }
		else
			clientModel = clientModels[vocab]
			data =
				if request.resourceName == '$serviceroot'
					__model: clientModel.resources
				else
					__model: clientModel.resources[request.resourceName]
			return { body: data, headers: { contentType: 'application/json' } }
		return Promise.resolve()

runPost = (req, res, request, tx) ->
	vocab = request.vocabulary

	idField = clientModels[vocab].resources[request.resourceName].idField

	runQuery(tx, request, null, idField)
	.then (sqlResult) ->
		validateModel(tx, vocab, request)
		.then ->
			# Return the inserted/updated id.
			if request.abstractSqlQuery[0] == 'UpdateQuery'
				request.sqlQuery.values[0]
			else
				sqlResult.insertId

respondPost = (req, res, request, result, tx) ->
	vocab = request.vocabulary
	id = result
	location = odataResourceURI(vocab, request.resourceName, id)
	api[vocab].logger.log('Insert ID: ', request.resourceName, id)
	runURI('GET', location, null, tx, req)
	.catch ->
		# If we failed to fetch the created resource then just return the id.
		return d: [{ id }]
	.then (result) ->
		runHook('PRERESPOND', { req, res, request, result, tx: tx })
		.then ->
			status: 201
			body: result.d[0]
			headers:
				contentType: 'application/json'
				Location: location


runPut = (req, res, request, tx) ->
	vocab = request.vocabulary

	Promise.try ->
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
		validateModel(tx, vocab, request)

respondPut = respondDelete = respondOptions = (req, res, request, tx) ->
	runHook('PRERESPOND', { req, res, request, tx: tx })
	.then ->
		status: 200
		headers: {}

runDelete = (req, res, request, tx) ->
	vocab = request.vocabulary

	runQuery(tx, request)
	.then ->
		validateModel(tx, vocab, request)

exports.executeStandardModels = executeStandardModels = (tx, callback) ->
	# dev model must run first
	executeModel(tx,
		apiRoot: 'dev'
		modelText: devModel
		logging:
			log: false
	)
	.then ->
		executeModels(tx, permissions.config.models)
	.then ->
		console.info('Sucessfully executed standard models.')
	.catch (err) ->
		console.error('Failed to execute standard models.', err, err.stack)
		throw err
	.nodeify(callback)

exports.addHook = (method, apiRoot, resourceName, callbacks) ->
	methodHooks = apiHooks[method]
	if !methodHooks?
		throw new Error('Unsupported method: ' + method)
	if apiRoot isnt 'all' and !clientModels[apiRoot]?
		throw new Error('Unknown api root: ' + apiRoot)
	if resourceName isnt 'all' and !clientModels[apiRoot].resources[resourceName]?
		throw new Error('Unknown resource for api root: ' + resourceName + ', ' + apiRoot)

	for callbackType, callback of callbacks when callbackType not in ['PREPARSE', 'POSTPARSE', 'PRERUN', 'POSTRUN', 'PRERESPOND']
		throw new Error('Unknown callback type: ' + callbackType)

	apiRootHooks = methodHooks[apiRoot] ?= {}
	resourceHooks = apiRootHooks[resourceName] ?= {}

	for callbackType, callback of callbacks
		resourceHooks[callbackType] ?= []
		resourceHooks[callbackType].push(callback)

exports.setup = (app, _db, callback) ->
	exports.db = db = _db
	AbstractSQLCompiler = AbstractSQLCompiler[db.engine]
	db.transaction()
	.then (tx) ->
		executeStandardModels(tx)
		.then ->
			permissions.setup(app, exports)
			_.extend(exports, permissions)
			tx.end()
		.catch (err) ->
			tx.rollback()
			console.error('Could not execute standard models', err, err.stack)
			process.exit(1)
	.then ->
		db.executeSql('CREATE UNIQUE INDEX "uniq_model_model_type_vocab" ON "model" ("vocabulary", "model type");')
		.catch -> # we can't use IF NOT EXISTS on all dbs, so we have to ignore the error raised if this index already exists
	.nodeify(callback)

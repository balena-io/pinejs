_ = require 'lodash'
Promise = require 'bluebird'
Promise.config(
	cancellation: true
)

{ cachedCompile } = require('./cached-compile')

LF2AbstractSQL = require '@resin/lf-to-abstract-sql'
AbstractSQLCompiler = require '@resin/abstract-sql-compiler'
AbstractSQLCompilerVersion = require('@resin/abstract-sql-compiler/package.json').version
{ PinejsClientCoreFactory } = require 'pinejs-client-core'
sbvrTypes = require '@resin/sbvr-types'
{ sqlNameToODataName, odataNameToSqlName } = require '@resin/odata-to-abstract-sql'
deepFreeze = require 'deep-freeze'
env = require '../config-loader/env'

SBVRParser = require '../extended-sbvr-parser/extended-sbvr-parser'

migrator = require '../migrator/migrator'
ODataMetadataGenerator = require '../sbvr-compiler/ODataMetadataGenerator'

devModel = require './dev.sbvr'
permissions = require './permissions'
uriParser = require './uri-parser'
errors = require './errors'
{ rollbackRequestHooks, instantiateHooks } = require './hooks'
_.assign(exports, errors)
{
	statusCodeToError
	InternalRequestError
	ParsingError
	PermissionError
	PermissionParsingError
	SbvrValidationError
	SqlCompilationError
	TranslationError
	UnsupportedMethodError
	BadRequestError
	HttpError
} = errors

controlFlow = require './control-flow'
memoize = require 'memoizee'
memoizeWeak = require 'memoizee/weak'
memoizedCompileRule = memoizeWeak(
	(abstractSqlQuery) ->
		sqlQuery = AbstractSQLCompiler.compileRule(abstractSqlQuery)
		modifiedFields = AbstractSQLCompiler.getModifiedFields(abstractSqlQuery)
		if modifiedFields?
			deepFreeze(modifiedFields)
		return {
			sqlQuery
			modifiedFields
		}
	max: env.cache.abstractSqlCompiler.max
)

compileRequest = (request) ->
	if request.abstractSqlQuery?
		try
			{ sqlQuery, modifiedFields } = memoizedCompileRule(request.abstractSqlQuery)
			request.sqlQuery = sqlQuery
			request.modifiedFields = modifiedFields
		catch err
			api[request.vocabulary].logger.error('Failed to compile abstract sql: ', request.abstractSqlQuery, err)
			throw new SqlCompilationError(err)
	return request

{ DEBUG } = process.env

db = null

exports.sbvrTypes = sbvrTypes

LF2AbstractSQLTranslator = LF2AbstractSQL.createTranslator(sbvrTypes)
LF2AbstractSQLTranslatorVersion = require('@resin/lf-to-abstract-sql/package.json').version + '+' + require('@resin/sbvr-types/package.json').version

seModels = {}
abstractSqlModels = {}
sqlModels = {}
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

memoizedResolvedSynonym = memoizeWeak(
	(abstractSqlModel, resourceName) ->
		sqlName = odataNameToSqlName(resourceName)
		return _(sqlName)
			.split('-')
			.map (resourceName) ->
				abstractSqlModel.synonyms[resourceName] ? resourceName
			.join('-')
		return abstractSqlModel
	primitive: true
)

exports.resolveSynonym = resolveSynonym = (request) ->
	abstractSqlModel = getAbstractSqlModel(request)
	return memoizedResolvedSynonym(abstractSqlModel, request.resourceName)

exports.resolveNavigationResource = resolveNavigationResource = (request, navigationName) ->
	navigation = _(odataNameToSqlName(navigationName))
		.split('-')
		.flatMap (resourceName) ->
			resolveSynonym({
				resourceName
				vocabulary: request.vocabulary
				abstractSqlModel: request.abstractSqlModel
			}).split('-')
		.concat('$')
		.value()
	resolvedResourceName = resolveSynonym(request)
	mapping = _.get(getAbstractSqlModel(request).relationships[resolvedResourceName], navigation)
	if !mapping?
		throw new Error("Cannot navigate from '#{request.resourceName}' to '#{navigationName}'")
	if mapping.length < 2
		throw new Error("'#{request.resourceName}' to '#{navigationName}' is a field not a navigation")
	return sqlNameToODataName(request.abstractSqlModel.tables[mapping[1][0]].name)

# TODO: Clean this up and move it into the db module.
prettifyConstraintError = (err, resourceName) ->
	if err instanceof db.ConstraintError
		if err instanceof db.UniqueConstraintError
			switch db.engine
				when 'mysql'
					matches = /ER_DUP_ENTRY: Duplicate entry '.*?[^\\]' for key '(.*?[^\\])'/.exec(err)
					throw new db.UniqueConstraintError('"' + sqlNameToODataName(matches[1]) + '" must be unique.')
				when 'postgres'
					tableName = odataNameToSqlName(resourceName)
					matches = new RegExp('"' + tableName + '_(.*?)_key"').exec(err)
					# We know it's the right error type, so if matches exists just throw a generic error message, since we have failed to get the info for a more specific one.
					if !matches?
						throw new db.UniqueConstraintError('Unique key constraint violated')
					columns = matches[1].split('_')
					throw new db.UniqueConstraintError('"' + columns.map(sqlNameToODataName).join('" and "') + '" must be unique.')

		if err instanceof db.ForeignKeyConstraintError
			switch db.engine
				when 'mysql'
					matches = /ER_ROW_IS_REFERENCED_: Cannot delete or update a parent row: a foreign key constraint fails \(".*?"\.(".*?").*/.exec(err)
				when 'postgres'
					tableName = odataNameToSqlName(resourceName)
					matches = new RegExp('"' + tableName + '" violates foreign key constraint ".*?" on table "(.*?)"').exec(err)
					matches ?= new RegExp('"' + tableName + '" violates foreign key constraint "' + tableName + '_(.*?)_fkey"').exec(err)
					# We know it's the right error type, so if matches exists just throw a generic error message, since we have failed to get the info for a more specific one.
					if !matches?
						throw new db.ForeignKeyConstraintError('Foreign key constraint violated')
			throw new db.ForeignKeyConstraintError('Data is referenced by ' + sqlNameToODataName(matches[1]) + '.')

		throw err

exports.resolveOdataBind = resolveOdataBind = (odataBinds, value) ->
	if _.isObject(value) and value.bind?
		[dataType, value] = odataBinds[value.bind]
	return value

getAndCheckBindValues = (vocab, odataBinds, bindings, values) ->
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

				sqlTableName = odataNameToSqlName(tableName)
				sqlFieldName = odataNameToSqlName(fieldName)
				field = _.find(sqlModelTables[sqlTableName].fields, {
					fieldName: sqlFieldName
				})
			else if _.isInteger(binding[1])
				if binding[1] >= odataBinds.length
					console.error("Invalid binding '#{binding[1]}' for binds: ", odataBinds)
					throw new Error('Invalid binding')
				[dataType, value] = odataBinds[binding[1]]
				field = { dataType }
			else if _.isString(binding[1])
				if !odataBinds.hasOwnProperty(binding[1])
					console.error("Invalid binding '#{binding[1]}' for binds: ", odataBinds)
					throw new Error('Invalid binding')
				[dataType, value] = odataBinds[binding[1]]
				field = { dataType }
			else
				throw new Error("Unknown binding: #{binding}")
		else
			[dataType, value] = binding
			field = { dataType }

		if value is undefined
			throw new Error("Bind value cannot be undefined: #{binding}")

		AbstractSQLCompiler.dataTypeValidate(value, field)
		.tapCatch (e) ->
			e.message = '"' + fieldName + '" ' + e.message

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
		{ modifiedFields } = request
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

		getAndCheckBindValues(modelName, null, rule.bindings, null)
		.then (values) ->
			tx.executeSql(rule.sql, values)
		.then (result) ->
			if result.rows[0].result in [false, 0, '0']
				throw new SbvrValidationError(rule.structuredEnglish)

exports.generateLfModel = generateLfModel = (seModel) ->
	return cachedCompile 'lfModel', SBVRParser.version, seModel, ->
		SBVRParser.matchAll(seModel, 'Process')

exports.generateAbstractSqlModel = generateAbstractSqlModel = (lfModel) ->
	return cachedCompile 'abstractSqlModel', LF2AbstractSQLTranslatorVersion, lfModel, ->
		LF2AbstractSQLTranslator(lfModel, 'Process')

generateModels = (vocab, seModel) ->
	try
		lfModel = generateLfModel(seModel)
	catch e
		console.error("Error parsing model '#{vocab}':", e)
		throw new Error("Error parsing model '#{vocab}': " + e)

	try
		abstractSqlModel = generateAbstractSqlModel(lfModel)
	catch e
		console.error("Error translating model '#{vocab}':", e)
		throw new Error("Error translating model '#{vocab}': " + e)

	try
		sqlModel = cachedCompile 'sqlModel', AbstractSQLCompilerVersion + '+' + db.engine, abstractSqlModel, ->
			AbstractSQLCompiler.compileSchema(abstractSqlModel)
		metadata = cachedCompile 'metadata', ODataMetadataGenerator.version, { vocab, sqlModel }, ->
			ODataMetadataGenerator(vocab, sqlModel)
	catch e
		console.error("Error compiling model '#{vocab}':", e)
		throw new Error("Error compiling model '#{vocab}': " + e)
	return { lfModel, abstractSqlModel, sqlModel, metadata }

exports.executeModel = executeModel = (tx, model, callback) ->
	executeModels(tx, [model], callback)

exports.executeModels = executeModels = (tx, models, callback) ->
	Promise.map models, (model) ->
		seModel = model.modelText
		vocab = model.apiRoot

		migrator.run(tx, model)
		.then ->
			{ lfModel, abstractSqlModel, sqlModel, metadata } = generateModels(vocab, seModel)

			# Create tables related to terms and fact types
			# Use `Promise.reduce` to run statements sequentially, as the order of the CREATE TABLE statements matters (eg. for foreign keys).
			Promise.each sqlModel.createSchema, (createStatement) ->
				promise = tx.executeSql(createStatement)
				if db.engine is 'websql'
					promise.catch (err) ->
						console.warn("Ignoring errors in the create table statements for websql as it doesn't support CREATE IF NOT EXISTS", err)
				return promise
			.then ->
				migrator.postRun(tx, model)
			.then ->
				seModels[vocab] = seModel
				_.each(abstractSqlModel.tables, (table) ->
					getLocalFields(table)
					getFetchProcessingFields(table)
				)
				deepFreeze(abstractSqlModel)
				abstractSqlModels[vocab] = abstractSqlModel
				sqlModels[vocab] = sqlModel
				odataMetadata[vocab] = metadata

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
					$select: 'id'
					$filter:
						is_of__vocabulary: model.vocab
						model_type: modelType
			.then (result) ->
				method = 'POST'
				uri = '/dev/model'
				body =
					is_of__vocabulary: model.vocab
					model_value: modelText
					model_type: modelType
				id = result[0]?.id
				if id?
					uri += '(' + id + ')'
					method = 'PATCH'
					body.id = id
				else
					uri += '?returnResource=false'

				runURI(method, uri, body, tx, permissions.root)

		Promise.all([
			updateModel('se', model.se)
			updateModel('lf', model.lf)
			updateModel('abstractsql', model.abstractsql)
			updateModel('sql', model.sql)
		])
	.tapCatch ->
		Promise.map models, (model) ->
			cleanupModel(model.apiRoot)
		return
	.nodeify(callback)

cleanupModel = (vocab) ->
	delete seModels[vocab]
	delete abstractSqlModels[vocab]
	delete sqlModels[vocab]
	delete odataMetadata[vocab]
	delete api[vocab]

getHooks = do ->
	mergeHooks = (a, b) ->
		_.mergeWith {}, a, b, (a, b) ->
			if _.isArray(a)
				return a.concat(b)
	getResourceHooks = (vocabHooks, resourceName) ->
		return {} if !vocabHooks?
		# When getting the hooks list for the sake of PREPARSE hooks
		# we don't know the resourceName we'll be acting on yet
		if !resourceName?
			return vocabHooks['all']
		mergeHooks(
			vocabHooks[resourceName]
			vocabHooks['all']
		)
	getVocabHooks = (methodHooks, vocabulary, resourceName) ->
		return {} if !methodHooks?
		mergeHooks(
			getResourceHooks(methodHooks[vocabulary], resourceName)
			getResourceHooks(methodHooks['all'], resourceName)
		)
	getMethodHooks = memoize(
		(method, vocabulary, resourceName) ->
			mergeHooks(
				getVocabHooks(apiHooks[method], vocabulary, resourceName)
				getVocabHooks(apiHooks['all'], vocabulary, resourceName)
			)
		primitive: true
	)

	_getHooks = (request) ->
		if request.resourceName?
			resourceName = resolveSynonym(request)
		instantiateHooks(
			getMethodHooks(
				request.method
				request.vocabulary
				resourceName
			)
		)
	_getHooks.clear = -> getMethodHooks.clear()
	return _getHooks

runHooks = Promise.method (hookName, args) ->
	hooks = args.req.hooks[hookName] || []
	requestHooks = args.request?.hooks?[hookName]
	if requestHooks?
		hooks = hooks.concat(requestHooks)
	return if hooks.length is 0
	Object.defineProperty args, 'api',
		get: _.once ->
			return api[args.request.vocabulary].clone(passthrough: _.pick(args, 'req', 'tx'))
	Promise.map hooks, (hook) ->
		hook.run(args)

exports.deleteModel = (vocabulary, callback) ->
	db.transaction (tx) ->
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
					$filter:
						is_of__vocabulary: vocabulary
		]))
	.then ->
		cleanupModel(vocabulary)
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
	Promise.method (vocab, abstractSqlModel, parentResourceName, fieldName, instance) ->
		try
			field = JSON.parse(instance[fieldName])
		catch
			# If we can't JSON.parse the field then we use it directly.
			field = instance[fieldName]

		if _.isArray(field)
			mappingResourceName = resolveNavigationResource({
				abstractSqlModel
				vocabulary: vocab
				resourceName: parentResourceName
			}, fieldName)
			processOData(vocab, abstractSqlModel, mappingResourceName, field)
			.then (expandedField) ->
				instance[fieldName] = expandedField
				return
		else if field?
			mappingResourceName = resolveNavigationResource({
				abstractSqlModel
				vocabulary: vocab
				resourceName: parentResourceName
			}, fieldName)
			instance[fieldName] = {
				__deferred:
					uri: '/' + vocab + '/' + mappingResourceName + '(' + field + ')'
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

getLocalFields = (table) ->
	if !table.localFields?
		table.localFields = {}
		for { fieldName, dataType } in table.fields when dataType isnt 'ForeignKey'
			odataName = sqlNameToODataName(fieldName)
			table.localFields[odataName] = true
	return table.localFields
getFetchProcessingFields = (table) ->
	return table.fetchProcessingFields ?=
		_(table.fields)
		.filter(({ dataType }) -> sbvrTypes[dataType]?.fetchProcessing?)
		.map ({ fieldName, dataType }) ->
			odataName = sqlNameToODataName(fieldName)
			return [
				odataName
				sbvrTypes[dataType].fetchProcessing
			]
		.fromPairs()
		.value()
processOData = (vocab, abstractSqlModel, resourceName, rows) ->
	if rows.length is 0
		return Promise.fulfilled([])

	if rows.length is 1
		if rows[0].$count?
			count = parseInt(rows[0].$count, 10)
			return Promise.fulfilled(count)

	sqlResourceName = resolveSynonym({ abstractSqlModel, vocabulary: vocab, resourceName })
	table = abstractSqlModel.tables[sqlResourceName]

	odataIdField = sqlNameToODataName(table.idField)
	instances = rows.map (instance) ->
		instance.__metadata =
			# TODO: This should support non-number id fields
			uri: odataResourceURI(vocab, resourceName, +instance[odataIdField])
			type: ''
		return instance

	instancesPromise = Promise.fulfilled()

	localFields = getLocalFields(table)
	# We check that it's not a local field, rather than that it is a foreign key because of the case where the foreign key is on the other resource
	# and hence not known to this resource
	expandableFields = _.filter(_.keys(instances[0]), (fieldName) -> fieldName[0..1] != '__' and !localFields.hasOwnProperty(fieldName))
	if expandableFields.length > 0
		instancesPromise = Promise.map instances, (instance) ->
			Promise.map expandableFields, (fieldName) ->
				checkForExpansion(vocab, abstractSqlModel, sqlResourceName, fieldName, instance)

	fetchProcessingFields = getFetchProcessingFields(table)
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
			rule = AbstractSQLCompiler.compileRule(ruleBody)
			getAndCheckBindValues(vocab, null, rule.bindings, null)
			.then (values) ->
				db.executeSql(rule.query, values)
			.then (result) ->
				table = abstractSqlModels[vocab].tables[resourceName]
				odataIdField = sqlNameToODataName(table.idField)
				ids = result.rows.map (row) -> row[table.idField]
				ids = _.uniq(ids)
				ids = _.map ids, (id) -> odataIdField + ' eq ' + id
				filter =
					if ids.length > 0
						ids.join(' or ')
					else
						'0 eq 1'
				runURI('GET', '/' + vocab + '/' + sqlNameToODataName(table.resourceName) + '?$filter=' + filter, null, null, permissions.rootRead)
				.then (result) ->
					result.__formulationType = formulationType
					result.__resourceName = resourceName
					return result
		.nodeify(callback)

exports.PinejsClient =
	class PinejsClient extends PinejsClientCoreFactory(Promise)
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

	# Remove undefined values from the body, as normally they would be removed by the JSON conversion
	_.each body, (v, k) ->
		if v is undefined
			delete body[k]

	req =
		on: _.noop
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
			on: _.noop
			statusCode: 200
			status: (@statusCode) ->
				return this
			sendStatus: (statusCode) ->
				if statusCode >= 400
					ErrorClass = statusCodeToError[statusCode]
					if ErrorClass?
						reject(new ErrorClass())
					else
						reject(new HttpError(statusCode))
				else
					resolve()
			send: (statusCode = @statusCode) ->
				@sendStatus(statusCode)
			json: (data, statusCode = @statusCode) ->
				if statusCode >= 400
					ErrorClass = statusCodeToError[statusCode]
					if ErrorClass?
						reject(new ErrorClass(data))
					else
						reject(new HttpError(statusCode, data))
				else
					resolve(data)
			set: _.noop
			type: _.noop

		next = (route) ->
			console.warn('Next called on a runURI?!', method, uri, route)
			res.sendStatus(500)

		handleODataRequest(req, res, next)
	.nodeify(callback)

exports.getAbstractSqlModel = getAbstractSqlModel = (request) ->
	request.abstractSqlModel ?= abstractSqlModels[request.vocabulary]
	return request.abstractSqlModel

exports.getAffectedIds = Promise.method ({ req, request, tx }) ->
	if request.method is 'GET'
		# GET requests don't affect anything so passing one to this method is a mistake
		throw new Error('Cannot call `getAffectedIds` with a GET request')
	# We reparse to make sure we get a clean odataQuery, without permissions already added
	# And we use the request's url rather than the req for things like batch where the req url is ../$batch
	uriParser.parseOData({
		method: request.method
		url: "/#{request.vocabulary}#{request.url}"
	})
	.then (request) ->
		abstractSqlModel = getAbstractSqlModel(request)
		resourceName = resolveSynonym(request)
		resourceTable = abstractSqlModel.tables[resourceName]
		if !resourceTable?
			throw new Error('Unknown resource: ' + request.resourceName)
		{ idField } = resourceTable

		_.set(request.odataQuery, [ 'options', '$select' ], {
			properties: [
				{ name: idField }
			]
		})

		# Delete any $expand that might exist as they're ignored on non-GETs but we're converting this request to a GET
		delete request.odataQuery.options.$expand

		permissions.addPermissions(req, request)
		.then ->

			request.method = 'GET'

			request = uriParser.translateUri(request)
			request = compileRequest(request)

			doRunQuery = (tx) ->
				runQuery(tx, request)
				.then (result) ->
					_.map(result.rows, idField)
			if tx?
				doRunQuery(tx)
			else
				runTransaction(req, doRunQuery)

exports.handleODataRequest = handleODataRequest = (req, res, next) ->
	url = req.url.split('/')
	apiRoot = url[1]
	if !apiRoot? or !abstractSqlModels[apiRoot]?
		return next('route')

	if DEBUG
		api[apiRoot].logger.log('Parsing', req.method, req.url)

	mapSeries = controlFlow.getMappingFn(req.headers)
	# Get the hooks for the current method/vocabulary as we know it,
	# in order to run PREPARSE hooks, before parsing gets us more info
	req.hooks = reqHooks = getHooks(
		method: req.method
		vocabulary: apiRoot
	)

	req.on 'close', ->
		handlePromise.cancel()
		rollbackRequestHooks(reqHooks)
	res.on 'close', ->
		handlePromise.cancel()
		rollbackRequestHooks(reqHooks)

	req.tx?.on 'rollback', ->
		rollbackRequestHooks(reqHooks)

	handlePromise = runHooks('PREPARSE', { req, tx: req.tx })
	.then ->
		{ method, url, body } = req

		# Check if it is a single request or a batch
		body = if req.batch?.length > 0 then req.batch else [{ method: method, url: url, data: body }]
		# Parse the OData requests
		mapSeries body, (bodypart) ->
			uriParser.parseOData(bodypart)
			.then controlFlow.liftP (request) ->
				# Get the full hooks list now that we can. We clear the hooks on
				# the global req to avoid duplication
				req.hooks = {}
				request.hooks = getHooks(request)
				# Add/check the relevant permissions
				runHooks('POSTPARSE', { req, request, tx: req.tx })
				.return(request)
				.then(uriParser.translateUri)
				.then(compileRequest)
				.tapCatch ->
					rollbackRequestHooks(reqHooks)
					rollbackRequestHooks(request)

			.then (request) ->
				# Run the request in its own transaction
				runTransaction req, (tx) ->
					tx.on 'rollback', ->
						rollbackRequestHooks(reqHooks)
						rollbackRequestHooks(request)
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
		if not (req.batch?.length > 0)

			[{ body, headers, status }] = responses
			_.forEach headers, (headerValue, headerName) ->
				res.set(headerName, headerValue)

			if not body
				if status?
					res.sendStatus(status)
				else
					console.error('No status or body set', req.url, responses)
					res.sendStatus(500)
			else
				if status?
					res.status(status)
				res.json(body)
		# Otherwise its a multipart request and we reply with the appropriate multipart response
		else
			res.status(200).sendMulti(responses)
	# If an error bubbles here it must have happened in the last then block
	# We just respond with 500 as there is probably not much we can do to recover
	.catch (e) ->
		console.error('An error occured while constructing the response', e, e.stack)
		res.sendStatus(500)

# Reject the error to use the nice catch syntax
constructError = (err) ->
	if err instanceof SbvrValidationError
		return { status: 400, body: err.message }
	else if err instanceof PermissionError
		return { status: 401, body: err.message }
	else if err instanceof SqlCompilationError or err instanceof TranslationError or err instanceof ParsingError or err instanceof PermissionParsingError
		return { status: 500 }
	else if err instanceof UnsupportedMethodError
		return { status: 405, body: err.message }
	else if err instanceof HttpError
		return { status: err.status, body: err.getResponseBody() }
	else
		console.error(err)
		# If the err is an error object then use its message instead - it should be more readable!
		if _.isError err
			err = err.message
		return { status: 404, body: err }

runRequest = (req, res, tx, request) ->
	{ logger } = api[request.vocabulary]

	if DEBUG
		logger.log('Running', req.method, req.url)
	# Forward each request to the correct method handler
	runHooks('PRERUN', { req, request, tx })
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
		# This cannot be a `.tapCatch` because for some reason throwing a db.UniqueConstraintError doesn't override
		# the error, when usually throwing an error does.
		prettifyConstraintError(err, request.resourceName)
		logger.error(err)
		# Override the error message so we don't leak any internal db info
		err.message = 'Database error'
		throw err
	.catch EvalError, RangeError, ReferenceError, SyntaxError, TypeError, URIError, (err) ->
		logger.error(err)
		throw new InternalRequestError()
	.tap (result) ->
		runHooks('POSTRUN', { req, request, result, tx })
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
					throw BadRequestError('Reference to a non existing resource in Changeset')
				else
					uriParser.parseId(ref.body.id)
			else
				[tag, id]
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
runTransaction = (req, callback) ->
	if req.tx?
		# If an existing tx was passed in then use it.
		callback(req.tx)
	else
		# Otherwise create a new transaction and handle tidying it up.
		db.transaction(callback)

# This is a helper function that will check and add the bind values to the SQL query and then run it.
runQuery = (tx, request, queryIndex, addReturning) ->
	{ values, odataBinds, sqlQuery, vocabulary } = request
	if queryIndex?
		sqlQuery = sqlQuery[queryIndex]
	getAndCheckBindValues(vocabulary, odataBinds, sqlQuery.bindings, values)
	.then (values) ->
		if DEBUG
			api[vocabulary].logger.log(sqlQuery.query, values)

		sqlQuery.values = values
		tx.executeSql(sqlQuery.query, values, addReturning)

runGet = (req, res, request, tx) ->
	if request.sqlQuery?
		runQuery(tx, request)

respondGet = (req, res, request, result, tx) ->
	vocab = request.vocabulary
	if request.sqlQuery?
		processOData(vocab, getAbstractSqlModel(request), request.resourceName, result.rows)
		.then (d) ->
			runHooks('PRERESPOND', { req, res, request, result, data: d, tx: tx })
			.then ->
				{ body: { d }, headers: { contentType: 'application/json' } }
	else
		if request.resourceName == '$metadata'
			return { body: odataMetadata[vocab], headers: { contentType: 'xml' } }
		else
			# TODO: request.resourceName can be '$serviceroot' or a resource and we should return an odata xml document based on that
			return {
				status: 404
			}

runPost = (req, res, request, tx) ->
	vocab = request.vocabulary

	idField = getAbstractSqlModel(request).tables[resolveSynonym(request)].idField

	runQuery(tx, request, null, idField)
	.tap (sqlResult) ->
		if sqlResult.rowsAffected is 0
			throw new PermissionError()
		validateModel(tx, vocab, request)
	.then (sqlResult) ->
		# Return the inserted/updated id.
		if request.abstractSqlQuery[0] == 'UpdateQuery'
			request.sqlQuery.values[0]
		else
			sqlResult.insertId

respondPost = (req, res, request, result, tx) ->
	vocab = request.vocabulary
	id = result
	location = odataResourceURI(vocab, request.resourceName, id)
	if DEBUG
		api[vocab].logger.log('Insert ID: ', request.resourceName, id)
	Promise.try ->
		onlyId = d: [{ id }]
		if _.get(request, [ 'odataQuery', 'options', 'returnResource' ]) in [ '0', 'false' ]
			return onlyId
		runURI('GET', location, null, tx, req)
		# If we failed to fetch the created resource then just return the id.
		.catchReturn(onlyId)
	.then (result) ->
		runHooks('PRERESPOND', { req, res, request, result, tx: tx })
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

respondPut = respondDelete = respondOptions = (req, res, request, result, tx) ->
	runHooks('PRERESPOND', { req, res, request, tx: tx })
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
	.tapCatch (err) ->
		console.error('Failed to execute standard models.', err)
	.nodeify(callback)


exports.addSideEffectHook = (method, apiRoot, resourceName, hooks) ->
	sideEffectHook = _.mapValues hooks, (hook) ->
		{
			HOOK: hook
			effects: true
		}
	addHook(method, apiRoot, resourceName, sideEffectHook)


exports.addPureHook = (method, apiRoot, resourceName, hooks) ->
	pureHooks = _.mapValues hooks, (hook) ->
		{
			HOOK: hook
			effects: false
		}
	addHook(method, apiRoot, resourceName, pureHooks)

addHook = (method, apiRoot, resourceName, hooks) ->
	methodHooks = apiHooks[method]
	if !methodHooks?
		throw new Error('Unsupported method: ' + method)
	if apiRoot isnt 'all' and !abstractSqlModels[apiRoot]?
		throw new Error('Unknown api root: ' + apiRoot)
	if resourceName isnt 'all'
		origResourceName = resourceName
		resourceName = resolveSynonym({ vocabulary: apiRoot, resourceName })
		if !abstractSqlModels[apiRoot].tables[resourceName]?
			throw new Error('Unknown resource for api root: ' + origResourceName + ', ' + apiRoot)


	for hookType, hook of hooks when hookType not in ['PREPARSE', 'POSTPARSE', 'PRERUN', 'POSTRUN', 'PRERESPOND']
		throw new Error('Unknown callback type: ' + hookType)

	apiRootHooks = methodHooks[apiRoot] ?= {}
	resourceHooks = apiRootHooks[resourceName] ?= {}

	for hookType, hook of hooks
		resourceHooks[hookType] ?= []
		resourceHooks[hookType].push(hook)

	getHooks.clear()
	return


exports.setup = (app, _db, callback) ->
	exports.db = db = _db
	AbstractSQLCompiler = AbstractSQLCompiler[db.engine]
	db.transaction (tx) ->
		executeStandardModels(tx)
		.then ->
			permissions.setup(app, exports)
			_.extend(exports, permissions)
	.catch (err) ->
		console.error('Could not execute standard models', err)
		process.exit(1)
	.then ->
		db.executeSql('CREATE UNIQUE INDEX "uniq_model_model_type_vocab" ON "model" ("is of-vocabulary", "model type");')
		.catch -> # we can't use IF NOT EXISTS on all dbs, so we have to ignore the error raised if this index already exists
	.nodeify(callback)

define [
	'has'
	'cs!extended-sbvr-parser'
	'lf-to-abstract-sql'
	'cs!sbvr-compiler/AbstractSQL2SQL'
	'abstract-sql-compiler'
	'cs!sbvr-compiler/AbstractSQL2CLF'
	'cs!sbvr-compiler/ODataMetadataGenerator'
	'odata-parser'
	'odata-to-abstract-sql'
	'lodash'
	'bluebird'
	'cs!sbvr-compiler/types'
], (has, SBVRParser, LF2AbstractSQL, AbstractSQL2SQL, AbstractSQLCompiler, AbstractSQL2CLF, ODataMetadataGenerator, {ODataParser}, {OData2AbstractSQL}, _, Promise, sbvrTypes) ->
	exports = {}
	db = null

	LF2AbstractSQLTranslator = LF2AbstractSQL.createTranslator(sbvrTypes)

	devModel = '''
			Vocabulary: dev

			Term:       model value
				Concept Type: JSON (Type)
			Term:       model
				Reference Scheme: model value
			Term:       vocabulary
				Concept Type: Short Text (Type)
			Term:       model type
				Concept Type: Short Text (Type)

			Fact Type: model is of vocabulary
				Necessity: Each model is of exactly one vocabulary
			Fact Type: model has model type
				Necessity: Each model has exactly one model type
			Fact Type: model has model value
				Necessity: Each model has exactly one model value'''

	transactionModel = '''
			Vocabulary: transaction

			Term:       resource id
				Concept type: Integer (Type)
			Term:       resource type
				Concept type: Text (Type)
			Term:       field name
				Concept type: Text (Type)
			Term:       field value
				Concept type: Text (Type)
			Term:       placeholder
				Concept type: Short Text (Type)

			Term:       resource
				Reference Scheme: resource id
			Fact type: resource has resource id
				Necessity: Each resource has exactly 1 resource id.
			Fact type: resource has resource type
				Necessity: Each resource has exactly 1 resource type.

			Term:       transaction

			Term:       lock
			Fact type:  lock is exclusive
			Fact type:  lock belongs to transaction
				Necessity: Each lock belongs to exactly 1 transaction.
			Fact type:  resource is under lock
				Synonymous Form: lock is on resource
			Rule:       It is obligatory that each resource that is under a lock that is exclusive, is under at most 1 lock.

			Term:       conditional type
				Concept Type: Short Text (Type)
				Definition: "ADD", "EDIT" or "DELETE"

			Term:       conditional resource
			Fact type:  conditional resource belongs to transaction
				Necessity: Each conditional resource belongs to exactly 1 transaction.
			Fact type:  conditional resource has lock
				Necessity: Each conditional resource has at most 1 lock.
			Fact type:  conditional resource has resource type
				Necessity: Each conditional resource has exactly 1 resource type.
			Fact type:  conditional resource has conditional type
				Necessity: Each conditional resource has exactly 1 conditional type.
			Fact type:  conditional resource has placeholder
				Necessity: Each conditional resource has at most 1 placeholder.
			--Rule:       It is obligatory that each conditional resource that has a placeholder, has a conditional type that is of "ADD".

			Term:       conditional field
				Reference Scheme: field name
			Fact type:  conditional field has field name
				Necessity: Each conditional field has exactly 1 field name.
			Fact type:  conditional field has field value
				Necessity: Each conditional field has at most 1 field value.
			Fact type:  conditional field is of conditional resource
				Necessity: Each conditional field is of exactly 1 conditional resource.

			--Rule:       It is obligatory that each conditional resource that has a conditional type that is of "EDIT" or "DELETE", has a lock that is exclusive
			Rule:       It is obligatory that each conditional resource that has a lock, has a resource type that is of a resource that the lock is on.
			Rule:       It is obligatory that each conditional resource that has a lock, belongs to a transaction that the lock belongs to.'''

	userModel = '''
			Vocabulary: Auth

			Term:       username
				Concept Type: Short Text (Type)
			Term:       password
				Concept Type: Hashed (Type)
			Term:       name
				Concept Type: Short Text (Type)

			Term:       permission
				Reference Scheme: name
			Fact type:  permission has name
				Necessity: Each permission has exactly one name.
				Necessity: Each name is of exactly one permission.

			Term:       role
				Reference Scheme: name
			Fact type:  role has name
				Necessity: Each role has exactly one name.
				Necessity: Each name is of exactly one role.
			Fact type:  role has permission

			Term:       user
				Reference Scheme: username
			Fact type:  user has username
				Necessity: Each user has exactly one username.
				Necessity: Each username is of exactly one user.
			Fact type:  user has password
				Necessity: Each user has exactly one password.
			Fact type:  user has role
				Note: A 'user' will inherit all the 'permissions' that the 'role' has.
			Fact type:  user has permission'''
	
	odataParser = ODataParser.createInstance()
	odata2AbstractSQL = {}

	seModels = {}
	sqlModels = {}
	clientModels = {}
	odataMetadata = {}

	checkForConstraintError = (err, tableName) ->
		# Unique key
		if (db.engine is 'mysql' and (matches = /ER_DUP_ENTRY: Duplicate entry '.*?[^\\]' for key '(.*?[^\\])'/.exec(err)) != null) or
				(db.engine is 'postgres' and (matches = new RegExp('error: duplicate key value violates unique constraint "' + tableName + '_(.*?)_key"').exec(err)) != null)
			return ['"' + matches[1] + '" must be unique.']
		else if err == 'could not execute statement (19 constraint failed)'
			# SQLite
			return ['Constraint failed.']
		# Foreign Key
		else if (db.engine is 'mysql' and (matches = /ER_ROW_IS_REFERENCED_: Cannot delete or update a parent row: a foreign key constraint fails \(".*?"\.(".*?").*/.exec(err)) != null) or
				(db.engine is 'postgres' and (matches = new RegExp('error: update or delete on table "' + tableName + '" violates foreign key constraint ".*?" on table "(.*?)"').exec(err)) != null)
			return ['Data is referenced by ' + matches[1].replace(/\ /g, '_').replace(/-/g, '__') + '.']
		else
			return false

	getAndCheckBindValues = (vocab, bindings, values) ->
		mappings = clientModels[vocab].resourceToSQLMappings
		sqlModelTables = sqlModels[vocab].tables
		Promise.all(_.map bindings, (binding) ->
			if _.isString(binding[1])
				[tableName, fieldName] = binding

				referencedName = tableName + '.' + fieldName
				value = values[referencedName]
				if value is undefined
					value = values[fieldName]

				[mappedTableName, mappedFieldName] = mappings[tableName][fieldName]
				field = _.where(sqlModelTables[mappedTableName].fields, {
					fieldName: mappedFieldName
				})[0]
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
				# 'GET', '/transaction/resource?$filter=resource__is_under__lock/lock eq ?'
				tx.executeSql('''SELECT "resource"."id", "resource"."resource id" AS "resource_id", "resource"."resource type" AS "resource_type"
								FROM "resource",
									"resource-is_under-lock"
								WHERE "resource"."id" = "resource-is_under-lock"."resource"
								AND "resource-is_under-lock"."lock" = ?;''', [lockID])
			getFieldsObject = (conditionalResourceID, clientModel) ->
				# 'GET', '/transaction/conditional_field?$filter=conditional_resource eq ?'
				tx.executeSql('''SELECT "conditional_field"."id", "conditional_field"."field name" AS "field_name", "conditional_field"."field value" AS "field_value", "conditional_field"."conditional resource" AS "conditional_resource"
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
							).then((fields) ->
								fields[clientModel.idField] = lockedRow.resource_id
								runURI('PUT', uri, fields, tx)
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
		Promise.all(_.map sqlmod.rules, (rule) ->
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
		validateFuncs = []
		Promise.all(_.map _.keys(models), (vocab) ->
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
			Promise.all(_.map sqlModel.createSchema, (createStatement) ->
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

				odata2AbstractSQL[vocab] = OData2AbstractSQL.createInstance()
				odata2AbstractSQL[vocab].clientModel = clientModel

				updateModel = (modelType, model) ->
					runURI('GET', "/dev/model?$filter=vocabulary eq '" + vocab + "' and model_type eq '" + modelType + "'", null, tx)
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
				for dropStatement in sqlModels[vocabulary].dropSchema
					tx.executeSql(dropStatement)
			Promise.all(dropStatements.concat([
				runURI('DELETE', "/dev/model?$filter=model_type eq 'se'", {vocabulary}, tx)
				runURI('DELETE', "/dev/model?$filter=model_type eq 'lf'", {vocabulary}, tx)
				runURI('DELETE', "/dev/model?$filter=model_type eq 'slf'", {vocabulary}, tx)
				runURI('DELETE', "/dev/model?$filter=model_type eq 'abstractsql'", {vocabulary}, tx)
				runURI('DELETE', "/dev/model?$filter=model_type eq 'sql'", {vocabulary}, tx)
				runURI('DELETE', "/dev/model?$filter=model_type eq 'client'", {vocabulary}, tx)
			])).then(->
				tx.end()
				seModels[vocabulary] = ''
				sqlModels[vocabulary] = {}
				clientModels[vocabulary] = {}
				odata2AbstractSQL[vocab].clientModel = {}
				odataMetadata[vocabulary] = ''
			).catch((err) ->
				tx.rollback()
				throw err
			)
		).nodeify(callback)

	getID = (tree) ->
		query = tree.requests[0].query
		for whereClause in query when whereClause[0] == 'Where'
			# TODO: This should use the idField from sqlModel
			for comparison in whereClause[1..] when comparison[0] == "Equals" and comparison[1][2] in ['id']
				return comparison[2][1]
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
			instancesPromise = Promise.all _.map instances, (instance) ->
				Promise.all(_.map expandableFields, (fieldName) ->
					checkForExpansion(vocab, clientModel, fieldName, instance)
				)

		processedFields = _.filter(resourceModel.fields, ({dataType}) -> sbvrTypes[dataType]?.fetchProcessing?)
		if processedFields.length > 0
			instancesPromise = instancesPromise.then ->
				Promise.all _.map instances, (instance) ->
					Promise.all _.map processedFields, ({fieldName, dataType}) ->
						fieldName = fieldName.replace(/\ /g, '_')
						if instance.hasOwnProperty(fieldName)
							Promise.promisify(sbvrTypes[dataType].fetchProcessing)(instance[fieldName])
							.then((result) ->
								instance[fieldName] = result
								return
							)

		instancesPromise.then(->
			return instances
		)

	exports.runRule = do ->
		LF2AbstractSQLPrepHack = LF2AbstractSQL.LF2AbstractSQLPrep._extend({CardinalityOptimisation: -> @_pred(false)})
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

					translator = LF2AbstractSQL.LF2AbstractSQL.createInstance()
					translator.addTypes(sbvrTypes)
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
		if callback? and typeof callback isnt 'function'
			message = 'Called runURI with a non-function callback?!'
			console.error(message)
			console.trace()
			return Promise.rejected(message)
		deferred = Promise.pending()
		console.log('Running URI', method, uri, body)
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

	exports.getUserPermissions = getUserPermissions = (userId, callback) ->
		Promise.all([
			runURI('GET', '/Auth/user__has__permission?$filter=user eq ' + userId, {})
			runURI('GET', '/Auth/user__has__role?$filter=user eq ' + userId)
			runURI('GET', '/Auth/role__has__permission')
			runURI('GET', '/Auth/permission')
		]).spread((userPermissions, userRoles, rolePermissions, permissions) ->
			transformObj = (args...) -> _.transform(args.concat({})...)

			permissions = transformObj permissions.d, (result, permission) ->
				result[permission.id] = permission.name

			rolePermissions = transformObj rolePermissions.d, (result, rolePermission) ->
				result[rolePermission.role.__id] ?= []
				result[rolePermission.role.__id].push(permissions[rolePermission.permission.__id])

			userPermissions = transformObj userPermissions.d, (result, userPermission) ->
				result[permissions[userPermission.permission.__id]] = true

			for userRole in userRoles.d
				for rolePermission in rolePermissions[userRole.role.__id]
					userPermissions[rolePermission] = true

			return userPermissions
		).catch((err) ->
			console.error('Error loading permissions', err, err.stack)
			throw err
		).nodeify(callback)

	exports.checkPermissions = checkPermissions = do ->
		_getGuestPermissions = do ->
			# Start the guest permissions as rejected,
			# since it will be attempted to be fetched again whenever it is rejected.
			_guestPermissions = Promise.rejected()
			return (callback) ->
				if _guestPermissions.isRejected()
					# Get guest user
					_guestPermissions = runURI('GET', "/Auth/user?$filter=user/username eq 'guest'")
					.then((result) ->
						if result.d.length is 0
							throw new Error('No guest permissions')
						getUserPermissions(result.d[0].id)
					)
				_guestPermissions.nodeify(callback)

		return (req, res, actionList, resourceName, vocabulary, callback) ->
			if !callback?
				if !vocabulary? and typeof resourceName is 'function'
					callback = resourceName
					resourceName = null
				else if typeof vocabulary is 'function'
					callback = vocabulary
					vocabulary = null

			_checkPermissions = (permissions) ->
				permissionKeys = _.keys(permissions)
				_recurseCheckPermissions = (permissionCheck) ->
					if _.isString(permissionCheck)
						resourcePermission = 'resource.' + permissionCheck
						if permissions.hasOwnProperty(resourcePermission)
							return true
						if vocabulary?
							vocabularyPermission = vocabulary + '.' + permissionCheck
							if permissions.hasOwnProperty(vocabularyPermission)
								return true
							if resourceName?
								vocabularyResourcePermission = vocabulary + '.' + resourceName + '.' + permissionCheck
								if permissions.hasOwnProperty(vocabularyResourcePermission)
									return true

						conditionalPermissions = _.map permissionKeys, (permissionName) ->
							for permission in [resourcePermission, vocabularyPermission, vocabularyResourcePermission] when permission?
								permission = permission + '?'
								if permissionName[...permission.length] == permission
									return permissionName[permission.length...].replace(/\$USER\.ID/g, req.user?.id ? 0)
							return false
						conditionalPermissions = _.filter(conditionalPermissions)

						if conditionalPermissions.length > 0
							return '(' + conditionalPermissions.join(' or ') + ')'
						return false
					else if _.isArray(permissionCheck)
						conditionalPermissions = []
						for permission in permissionCheck
							result = _recurseCheckPermissions(permission)
							if result is false
								return false
							else if result isnt true
								conditionalPermissions.push(result)
						if conditionalPermissions.length > 0
							return '(' + conditionalPermissions.join(' and ') + ')'
						else
							return true
					else if _.isObject(permissionCheck)
						checkTypes = _.keys(permissionCheck)
						if checkTypes.length > 1
							throw 'Too many check types: ' + checkTypes
						checkType = checkTypes[0]
						switch checkType.toUpperCase()
							when 'AND'
								return _recurseCheckPermissions(permissionCheck[checkType])
							when 'OR'
								conditionalPermissions = []
								for permission in permissionCheck[checkType]
									result = _recurseCheckPermissions(permission)
									if result is true
										return true
									else if result isnt false
										conditionalPermissions.push(result)
								if conditionalPermissions.length > 0
									return '(' + conditionalPermissions.join(' or ') + ')'
								else
									return false
							else
								throw 'Cannot parse required permissions logic: ' + checkType
						return false
					else
						throw 'Cannot parse required permissions: ' + permissionCheck

				return _recurseCheckPermissions(or: ['all', actionList])

			if req.user?
				allowed = _checkPermissions(req.user.permissions)
				if allowed is true
					return Promise.fulfilled(allowed).nodeify(callback)
			_getGuestPermissions()
			.then((permissions) ->
				return _checkPermissions(permissions)
			).catch((err) ->
				console.error('Error getting guest permissions', err, err.stack)
				return []
			).then((guestAllowed) ->
				if guestAllowed is true
					return true
				if allowed is false
					if guestAllowed is false
						return false
					return guestAllowed
				return '(' + allowed + ' or ' + guestAllowed + ')'
			).nodeify(callback)
	exports.checkPermissionsMiddleware = (action) ->
		return (req, res, next) -> 
			checkPermissions(req, res, action)
			.then((allowed) ->
				switch allowed
					when false
						res.send(401)
					when true
						next()
					else
						throw new Error('checkPermissionsMiddleware returned a conditional permission')
			).catch((err) ->
				console.error('Error checking permissions', err, err.stack)
				res.send(503)
			)

	parseODataURI = (req, res) -> Promise.try ->
		{method, url, body} = req
		url = url.split('/')
		vocabulary = url[1]
		if !vocabulary? or !odata2AbstractSQL[vocabulary]?
			throw new Error('No such vocabulary: ' + vocabulary)
		url = '/' + url[2..].join('/')
		try
			query = odataParser.matchAll(url, 'Process')
		catch e
			console.log('Failed to parse url: ', method, url, e, e.stack)
			throw new Error('Failed to parse url')

		resourceName = query.resource

		permissionType =
			if resourceName in ['$metadata', '$serviceroot']
				query = null
				'model'
			else
				switch method
					when 'GET'
						'get'
					when 'PUT', 'POST', 'PATCH', 'MERGE'
						'set'
					when 'DELETE'
						'delete'
					else
						console.warn('Unknown method for permissions type check: ', method)
						'all'
		checkPermissions(req, res, permissionType, resourceName, vocabulary)
		.then((conditionalPerms) ->
			if conditionalPerms is false
				return false
			else if conditionalPerms isnt true
				if !query?
					throw new Error('Conditional permissions with no query?!')
				try
					conditionalPerms = odataParser.matchAll('/x?$filter=' + conditionalPerms, 'Process')
				catch e
					console.log('Failed to parse conditional permissions: ', conditionalPerms)
					throw new Error('Failed to parse permissions')
				query.options ?= {}
				if query.options.$filter?
					query.options.$filter = ['and', query.options.$filter, conditionalPerms.options.$filter]
				else
					query.options.$filter = conditionalPerms.options.$filter
			if query?
				try
					query = odata2AbstractSQL[vocabulary].match(query, 'Process', [method, body])
				catch e
					console.error('Failed to translate url: ', JSON.stringify(query, null, '\t'), method, url, e, e.stack)
					throw new Error('Failed to translate url')
			return {
				type: 'OData'
				vocabulary
				requests: [{
					query
					values: body
					resourceName
				}]
			}
		)

	parseURITree = (callback) ->
		(req, res, next) ->
			args = arguments
			checkTree = ->
				if req.tree == false
					next('route')
				else if callback?
					callback(args...)
				else
					next()
			if req.tree?
				checkTree()
			else
				parseODataURI(req, res)
				.then((tree) ->
					req.tree = tree
				).catch((err) ->
					console.error(err)
					req.tree = false
				).done(checkTree)

	exports.runGet = runGet = parseURITree (req, res, next, tx) ->
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

	exports.runPost = runPost = parseURITree (req, res, next, tx) ->
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

	exports.runPut = runPut = parseURITree (req, res, next, tx) ->
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

	exports.runDelete = runDelete = parseURITree (req, res, next, tx) ->
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
			# TODO: Remove these hardcoded users.
			if has 'DEV'
				Promise.all([
					runURI('POST', '/Auth/user', {'username': 'root', 'password': 'test123'})
					runURI('POST', '/Auth/permission', {'name': 'resource.all'})
				]).then(->
					# We expect these to be the first user/permission, so they would have id 1.
					runURI('POST', '/Auth/user__has__permission', {'user': 1, 'permission': 1})
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
				transactionURI: "/transaction/transaction"
				conditionalResourceURI: "/transaction/conditional_resource"
				conditionalFieldURI: "/transaction/conditional_field"
				lockURI: "/transaction/lock"
				transactionLockURI: "/transaction/lock__belongs_to__transaction"
				resourceURI: "/transaction/resource"
				lockResourceURI: "/transaction/resource__is_under__lock"
				exclusiveLockURI: "/transaction/lock__is_exclusive"
				commitTransactionURI: "/transaction/execute"
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

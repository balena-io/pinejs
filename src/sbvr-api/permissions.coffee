_ = require 'lodash'
Promise = require 'bluebird'
env = require '../config-loader/env'
userModel = require './user.sbvr'
{ metadataEndpoints, memoizedParseOdata } = require './uri-parser'
{ BadRequestError, PermissionError, PermissionParsingError } = require './errors'
{ ODataParser } = require '@resin/odata-parser'
memoize = require 'memoizee'
memoizeWeak = require 'memoizee/weak'
{ sqlNameToODataName } = require '@resin/odata-to-abstract-sql'

DEFAULT_ACTOR_BIND = '@__ACTOR_ID'
DEFAULT_ACTOR_BIND_REGEX = new RegExp(_.escapeRegExp(DEFAULT_ACTOR_BIND), 'g')

exports.PermissionError = PermissionError
exports.PermissionParsingError = PermissionParsingError
exports.root = user: permissions: [ 'resource.all' ]
exports.rootRead = rootRead = user: permissions: [ 'resource.get' ]
methodPermissions =
	GET: or: ['get', 'read']
	PUT:
		or: [
			'set'
			and: ['create', 'update']
		]
	POST: or: ['set', 'create']
	PATCH: or: ['set', 'update']
	MERGE: or: ['set', 'update']
	DELETE: 'delete'

_parsePermissions = do ->
	odataParser = ODataParser.createInstance()
	return memoize(
		(filter) ->
			# Reset binds
			odataParser.binds = []
			tree = odataParser.matchAll(['FilterByExpression', filter], 'ProcessRule')
			return {
				tree
				extraBinds: odataParser.binds
			}
		primitive: true
		max: env.cache.parsePermissions.max
	)

rewriteBinds = ({ tree, extraBinds }, odataBinds) ->
	# Add the extra binds we parsed onto our existing list of binds vars.
	bindsLength = odataBinds.length
	odataBinds.push(extraBinds...)
	# Clone the tree so the cached version can't be mutated and at the same time fix the bind numbers
	return _.cloneDeepWith tree, (value) ->
		bind = value?.bind
		if _.isInteger(bind)
			return { bind: value.bind + bindsLength }

parsePermissions = (filter, odataBinds) ->
	odata = _parsePermissions(filter)
	rewriteBinds(odata, odataBinds)

# Traverses all values in `check`, actions for the following data types:
# string: Calls `stringCallback` and uses the value returned instead
# boolean: Used as-is
# array: Treated as an AND of all elements
# object: Must have only one key of either `AND` or `OR`, with an array value that will be treated according to the key.
exports.nestedCheck = nestedCheck = (check, stringCallback) ->
	if _.isString(check)
		stringCallback(check)
	else if _.isBoolean(check)
		return check
	else if _.isArray(check)
		results = []
		for subcheck in check
			result = nestedCheck(subcheck, stringCallback)
			if result is false
				return false
			else if result isnt true
				results = results.concat(result)
		if results.length is 1
			return results[0]
		else if results.length > 1
			return _.uniq(results)
		else
			return true
	else if _.isObject(check)
		checkTypes = _.keys(check)
		if checkTypes.length > 1
			throw new Error('More than one check type: ' + checkTypes)
		checkType = checkTypes[0]
		switch checkType.toUpperCase()
			when 'AND'
				return nestedCheck(check[checkType], stringCallback)
			when 'OR'
				results = []
				for subcheck in check[checkType]
					result = nestedCheck(subcheck, stringCallback)
					if result is true
						return true
					else if result isnt false
						results = results.concat(result)
				if results.length is 1
					return results[0]
				else if results.length > 1
					return _.uniq(results)
				else
					return false
			else
				throw new Error('Cannot parse required checking logic: ' + checkType)
	else
		throw new Error('Cannot parse required checks: ' + check)

collapsePermissionFilters = (v) ->
	if _.isArray(v)
		collapsePermissionFilters(or: v)
	else if _.isObject(v)
		if v.hasOwnProperty('filter')
			v.filter
		else
			_(v)
			.toPairs()
			.flattenDeep()
			.map(collapsePermissionFilters)
			.value()
	else
		v

addRelationshipBypasses = (relationships) ->
	_.each relationships, (relationship, key) ->
		return if key is '$'

		mapping = relationship.$
		if mapping? and mapping.length is 2
			mapping = _.cloneDeep(mapping)
			mapping[1][0] = "#{mapping[1][0]}$bypass"
			relationships["#{key}$bypass"] = {
				$: mapping
			}
		addRelationshipBypasses(relationship)

getPermissionsLookup = memoize(
	(permissions) ->
		permissionsLookup = {}
		for permission in permissions
			[ target, condition ] = permission.split('?')
			if !condition?
				# We have unconditional permission
				permissionsLookup[target] = true
			else if permissionsLookup[target] != true
				permissionsLookup[target] ?= []
				permissionsLookup[target].push(condition)
		return permissionsLookup
	primitive: true
	max: env.cache.permissionsLookup.max
)

checkPermissions = (permissionsLookup, actionList, vocabulary, resourceName) ->
	checkObject = or: ['all', actionList]
	return nestedCheck checkObject, (permissionCheck) ->
		resourcePermission = permissionsLookup['resource.' + permissionCheck]
		if resourcePermission is true
			return true
		if vocabulary?
			vocabularyPermission = permissionsLookup[vocabulary + '.' + permissionCheck]
			if vocabularyPermission is true
				return true
			if resourceName?
				vocabularyResourcePermission = permissionsLookup[vocabulary + '.' + resourceName + '.' + permissionCheck]
				if vocabularyResourcePermission is true
					return true

		conditionalPermissions = [].concat(resourcePermission, vocabularyPermission, vocabularyResourcePermission)
		# Remove the undefined elements.
		conditionalPermissions = _.filter(conditionalPermissions)

		if conditionalPermissions.length is 1
			return conditionalPermissions[0]
		else if conditionalPermissions.length > 1
			return or: conditionalPermissions
		return false

generateConstrainedAbstractSql = (permissionsLookup, actionList, vocabulary, resourceName) ->
	uriParser = require('./uri-parser')

	conditionalPerms = checkPermissions(permissionsLookup, actionList, vocabulary, resourceName)
	if conditionalPerms is false
		throw new PermissionError()
	if conditionalPerms is true
		# If we have full access then no need to provide a constrained definition
		return false

	odata = memoizedParseOdata("/#{resourceName}")

	permissionFilters = nestedCheck conditionalPerms, (permissionCheck) ->
		try
			permissionCheck = parsePermissions(permissionCheck, odata.binds)
			# We use an object with filter key to avoid collapsing our filters later.
			return filter: permissionCheck
		catch e
			console.warn('Failed to parse conditional permissions: ', permissionCheck)
			throw new PermissionParsingError(e)

	permissionFilters = collapsePermissionFilters(permissionFilters)
	_.set(odata, [ 'tree', 'options', '$filter' ], permissionFilters)

	{ odataBinds, abstractSqlQuery } = uriParser.translateUri({
		method: 'GET',
		resourceName,
		vocabulary,
		odataBinds: odata.binds,
		odataQuery: odata.tree,
		values: {}
	})
	abstractSqlQuery = _.clone(abstractSqlQuery)
	# Remove aliases from the top level select
	selectIndex = _.findIndex(abstractSqlQuery, 0: 'Select')
	select = abstractSqlQuery[selectIndex] = _.clone(abstractSqlQuery[selectIndex])
	select[1] = _.map select[1], (selectField) ->
		if selectField.length is 2 and _.isArray(selectField[0])
			return selectField[0]
		return selectField

	return { extraBinds: odataBinds, abstractSqlQuery }

# Call the function once and either return the same result or throw the same error on subsequent calls
onceGetter = (obj, propName, fn) ->
	thrownErr = undefined
	Object.defineProperty obj, propName,
		enumerable: true
		configurable: true
		get: ->
			if thrownErr?
				throw thrownErr
			try
				result = fn()
				fn = undefined
				delete this[propName]
				this[propName] = result
			catch thrownErr
				throw thrownErr

deepFreezeExceptDefinition = (obj) ->
	Object.freeze(obj)

	Object.getOwnPropertyNames(obj).forEach (prop) ->
		# We skip the definition because we know it's a property we've defined that will throw an error in some cases
		if prop isnt 'definition' and
		obj.hasOwnProperty(prop) and
		obj[prop] isnt null and
		(typeof obj[prop] not in [ 'object', 'function' ])
			deepFreezeExceptDefinition(obj)
	return

memoizedGetConstrainedModel = memoizeWeak(
	(abstractSqlModel, permissionsLookup, vocabulary) ->
		abstractSqlModel = _.cloneDeep(abstractSqlModel)
		addRelationshipBypasses(abstractSqlModel.relationships)
		_.each abstractSqlModel.synonyms, (canonicalForm, synonym) ->
			abstractSqlModel.synonyms["#{synonym}$bypass"] = "#{canonicalForm}$bypass"
		addRelationshipBypasses(abstractSqlModel.relationships)
		_.each abstractSqlModel.relationships, (relationship, key) ->
			abstractSqlModel.relationships["#{key}$bypass"] = relationship
		_.each abstractSqlModel.tables, (table) ->
			abstractSqlModel.tables["#{table.resourceName}$bypass"] = _.clone(table)
			onceGetter table, 'definition', ->
				# For $filter on eg a DELETE you need read permissions on the sub-resources,
				# you only need delete permissions on the resource being deleted
				generateConstrainedAbstractSql(permissionsLookup, methodPermissions.GET, vocabulary, sqlNameToODataName(table.name))
		deepFreezeExceptDefinition(abstractSqlModel)
		return abstractSqlModel
	normalizer: (abstractSqlModel, args) ->
		return JSON.stringify(args)
)

exports.config =
	models: [
		apiRoot: 'Auth'
		modelText: userModel
		customServerCode: exports
	]
exports.setup = (app, sbvrUtils) ->
	sbvrUtils.addPureHook 'all', 'all', 'all',
		PREPARSE: ({ req }) ->
			apiKeyMiddleware(req)
		POSTPARSE: ({ req, request }) ->
			# If the abstract sql query is already generated then adding permissions will do nothing
			return if request.abstractSqlQuery?
			if (request.method == 'POST' and request.odataQuery.property?.resource == 'canAccess')
				if !request.odataQuery.key?
					throw new BadRequestError()
				{ action, method } = request.values
				if method? and action?
					throw new BadRequestError()
				else if method? and methodPermissions[method]?
					request.permissionType = methodPermissions[method]
				else if action?
					request.permissionType = action
				else
					throw new BadRequestError()
				abstractSqlModel = sbvrUtils.getAbstractSqlModel(request)
				request.resourceName = request.resourceName.slice(0, -'#canAccess'.length)
				resourceName = sbvrUtils.resolveSynonym(request)
				resourceTable = abstractSqlModel.tables[resourceName]
				if !resourceTable?
					throw new Error('Unknown resource: ' + request.resourceName)
				idField = resourceTable.idField
				request.odataQuery.options = { '$select': { 'properties': [ { 'name': idField } ] }, $top: 1 }
				request.odataQuery.resource = request.resourceName
				delete request.odataQuery.property
				request.method = 'GET'
				request.custom.isAction = 'canAccess'
			addPermissions(req, request)
		PRERESPOND: ({ request, data }) ->
			if (request.custom.isAction == 'canAccess')
				if (_.isEmpty(data))
					# If the caller does not have any permissions to access the
					# resource pine will throw a PermissionError. To have the
					# same behavior for the case that the user has permissions
					# to access the resource, but not this instance we also
					# throw a PermissionError if the result is empty.
					throw new PermissionError()


	sbvrUtils.addPureHook 'POST', 'Auth', 'user',
		POSTPARSE: ({ request, api }) ->
			api.post
				resource: 'actor'
				options: { returnResource: false }
			.then (result) ->
				request.values.actor = result.id

	sbvrUtils.addPureHook 'DELETE', 'Auth', 'user',
		POSTRUN: ({ request, api }) ->
			api.delete
				resource: 'actor'
				id: request.values.actor

	exports.checkPassword = (username, password, callback) ->
		authApi = sbvrUtils.api.Auth
		authApi.get
			resource: 'user'
			passthrough: req: rootRead
			options:
				$select: ['id', 'actor', 'password']
				$filter:
					username: username
		.then (result) ->
			if result.length is 0
				throw new Error('User not found')
			hash = result[0].password
			userId = result[0].id
			actorId = result[0].actor
			sbvrUtils.sbvrTypes.Hashed.compare(password, hash)
			.then (res) ->
				if !res
					throw new Error('Passwords do not match')
				getUserPermissions(userId)
				.then (permissions) ->
					return {
						id: userId
						actor: actorId
						username: username
						permissions: permissions
					}
		.nodeify(callback)

	getPermissions = (permsFilter, callback) ->
		authApi = sbvrUtils.api.Auth
		authApi.get
			resource: 'permission'
			passthrough: req: rootRead
			options:
				$select: 'name'
				$filter: permsFilter
				# We orderby to increase the hit rate for the `_checkPermissions` memoisation
				$orderby: name: 'asc'
		.map (permission) -> permission.name
		.tapCatch (err) ->
			authApi.logger.error('Error loading permissions', err, err.stack)
		.nodeify(callback)

	exports.getUserPermissions = getUserPermissions = (userId, callback) ->
		if _.isString(userId)
			userId = _.parseInt(userId)
		if !_.isFinite(userId)
			return Promise.rejected(new Error('User ID has to be numeric, got: ' + typeof userId))
		permsFilter = $or:
			is_of__user: $any:
				$alias: 'uhp'
				$expr:
					uhp: user: userId
					$or: [
						uhp: expiry_date: null
					,	uhp: expiry_date: $gt: $now: null
					]
			is_of__role: $any:
				$alias: 'rhp'
				$expr: rhp: role: $any:
					$alias: 'r'
					$expr: r: is_of__user: $any:
						$alias: 'uhr'
						$expr:
							uhr: user: userId
							$or: [
								uhr: expiry_date: null
							,	uhr: expiry_date: $gt: $now: null
							]
		return getPermissions(permsFilter, callback)

	exports.getApiKeyPermissions = getApiKeyPermissions = do ->
		_getApiKeyPermissions = memoize(
			(apiKey) ->
				permsFilter = $or:
					is_of__api_key: $any:
						$alias: 'khp'
						$expr: khp: api_key: $any:
							$alias: 'k'
							$expr: k: key: apiKey
					is_of__role: $any:
						$alias: 'rhp'
						$expr: 'rhp': role: $any:
							$alias: 'r'
							$expr: r: is_of__api_key: $any:
								$alias: 'khr'
								$expr: khr: api_key: $any:
									$alias: 'k'
									$expr: k: key: apiKey
				return getPermissions(permsFilter)
			primitive: true
			max: env.cache.apiKeys.max
			maxAge: env.cache.apiKeys.maxAge
		)
		return (apiKey, callback) ->
			promise =
				if _.isString(apiKey)
					_getApiKeyPermissions(apiKey)
				else
					Promise.rejected(new Error('API key has to be a string, got: ' + typeof apiKey))
			return promise.nodeify(callback)

	getApiKeyActorId = memoize(
		(apiKey) ->
			sbvrUtils.api.Auth.get
				resource: 'api_key'
				passthrough: req: rootRead
				options:
					$select: 'is_of__actor'
					$filter: key: apiKey
			.then (apiKeys) ->
				if apiKeys.length is 0
					throw new Error('Could not find the api key')
				apiKeyActorID = apiKeys[0].is_of__actor.__id
				if !apiKeyActorID?
					throw new Error('API key is not linked to a actor?!')
				return apiKeyActorID
		primitive: true
		promise: true
		maxAge: env.cache.apiKeys.maxAge
	)

	checkApiKey = (req, apiKey) ->
		Promise.try ->
			if !apiKey? or req.apiKey?
				return
			getApiKeyPermissions(apiKey)
			.catch (err) ->
				console.warn('Error with API key:', err)
				# Ignore errors getting the api key and just use an empty permissions object
				return []
			.then (permissions) ->
				req.apiKey =
					key: apiKey
					permissions: permissions

	exports.customAuthorizationMiddleware = customAuthorizationMiddleware = (expectedScheme = 'Bearer') ->
		expectedScheme = expectedScheme.toLowerCase()
		return (req, res, next) ->
			Promise.try ->
				auth = req.header('Authorization')
				if !auth
					return

				parts = auth.split(' ')
				if parts.length isnt 2
					return

				[ scheme, apiKey ] = parts
				if scheme.toLowerCase() isnt expectedScheme
					return

				checkApiKey(req, apiKey)
			.then ->
				next?()
				return

	# A default bearer middleware for convenience
	exports.authorizationMiddleware = customAuthorizationMiddleware()

	exports.customApiKeyMiddleware = customApiKeyMiddleware = (paramName = 'apikey') ->
		return (req, res, next) ->
			apiKey = req.params[paramName] ? req.body[paramName] ? req.query[paramName]
			checkApiKey(req, apiKey)
			.then ->
				next?()
				return

	# A default api key middleware for convenience
	exports.apiKeyMiddleware = apiKeyMiddleware = customApiKeyMiddleware()

	exports.checkPermissions = (req, actionList, resourceName, vocabulary) ->
		getReqPermissions(req)
		.then (permissionsLookup) ->
			checkPermissions(permissionsLookup, actionList, vocabulary, resourceName)

	exports.checkPermissionsMiddleware = (action) ->
		return (req, res, next) ->
			exports.checkPermissions(req, action)
			.then (allowed) ->
				switch allowed
					when false
						res.sendStatus(401)
					when true
						next()
					else
						throw new Error('checkPermissionsMiddleware returned a conditional permission')
			.catch (err) ->
				sbvrUtils.api.Auth.logger.error('Error checking permissions', err, err.stack)
				res.sendStatus(503)

	getReqPermissions = do ->
		_getGuestPermissions = do ->
			# Start the guest permissions as null, having it as a reject promise either
			# causes an issue with an unhandled rejection, or with enabling long stack traces.
			_guestPermissions = null
			return ->
				if !_guestPermissions? or _guestPermissions.isRejected()
					# Get guest user
					_guestPermissions = sbvrUtils.api.Auth.get
						resource: 'user'
						passthrough: req: rootRead
						options:
							$select: 'id'
							$filter:
								username: 'guest'
					.then (result) ->
						if result.length is 0
							throw new Error('No guest permissions')
						getUserPermissions(result[0].id)
				return _guestPermissions

		return (req, odataBinds = {}) ->
			Promise.join(
				_getGuestPermissions()
				Promise.try ->
					if req.apiKey?.permissions?.length > 0
						getApiKeyActorId(req.apiKey.key)
				(guestPermissions, apiKeyActorID) ->
					if _.some(guestPermissions, (p) -> DEFAULT_ACTOR_BIND_REGEX.test(p))
						throw new Error('Guest permissions cannot reference actors')

					permissions = guestPermissions

					actorIndex = 0
					addActorPermissions = (actorId, actorPermissions) ->
						actorBind = DEFAULT_ACTOR_BIND
						if actorIndex > 0
							actorBind += actorIndex
							actorPermissions = _.map actorPermissions, (actorPermission) ->
								actorPermission.replace(DEFAULT_ACTOR_BIND_REGEX, actorBind)
						odataBinds[actorBind] = [ 'Real', actorId ]
						actorIndex++
						permissions = permissions.concat(actorPermissions)

					if req.user?.permissions?
						addActorPermissions(req.user.actor, req.user.permissions)
					if req.apiKey?.permissions?
						addActorPermissions(apiKeyActorID, req.apiKey.permissions)

					permissions = _.uniq(permissions)

					return getPermissionsLookup(permissions)
			)

	resolveSubRequest = (request, lambda, propertyName, v) ->
		if !lambda[propertyName]?
			v.name = "#{propertyName}$bypass"
		newResourceName = lambda[propertyName] ? sbvrUtils.resolveNavigationResource(request, propertyName)
		return {
			abstractSqlModel: request.abstractSqlModel
			vocabulary: request.vocabulary
			resourceName: newResourceName
		}

	memoizedRewriteODataOptions = do ->
		rewriteODataOptions = (request, data, lambda = {}) ->
			_.each data, (v, k) ->
				if _.isArray(v)
					rewriteODataOptions(request, v, lambda)
				else if _.isObject(v)
					propertyName = v.name
					if propertyName?
						if v.lambda?
							newLambda = _.clone(lambda)
							newLambda[v.lambda.identifier] = sbvrUtils.resolveNavigationResource(request, propertyName)
							# TODO: This should actually use the top level resource context,
							# however odata-to-abstract-sql is bugged so we use the lambda context to match that bug for now
							subRequest = resolveSubRequest(request, lambda, propertyName, v)
							rewriteODataOptions(subRequest, v, newLambda)
						else if v.options?
							_.each v.options, (option, optionName) ->
								subRequest = resolveSubRequest(request, lambda, propertyName, v)
								rewriteODataOptions(subRequest, option, lambda)
						else if v.property?
							subRequest = resolveSubRequest(request, lambda, propertyName, v)
							rewriteODataOptions(subRequest, v, lambda)
						else
							rewriteODataOptions(request, v, lambda)
					else
						rewriteODataOptions(request, v, lambda)
		return memoizeWeak(
			(abstractSqlModel, vocabulary, resourceName, filter, tree) ->
				tree = _.cloneDeep(tree)
				rewriteODataOptions({ abstractSqlModel, vocabulary, resourceName }, [tree])
				return tree
			normalizer: (abstractSqlModel, [ vocabulary, resourceName, filter ]) ->
				filter + vocabulary + resourceName
		)

	parseRewrittenPermissions = (abstractSqlModel, vocabulary, resourceName, filter, odataBinds) ->
		{ tree, extraBinds } = _parsePermissions(filter)
		tree = memoizedRewriteODataOptions(abstractSqlModel, vocabulary, resourceName, filter, tree)
		return rewriteBinds({ tree, extraBinds }, odataBinds)

	addODataPermissions = (permissionsLookup, permissionType, vocabulary, resourceName, odataQuery, odataBinds, abstractSqlModel) ->
		conditionalPerms = checkPermissions(permissionsLookup, permissionType, vocabulary, resourceName)

		if conditionalPerms is false
			throw new PermissionError()
		if conditionalPerms isnt true
			permissionFilters = nestedCheck conditionalPerms, (permissionCheck) ->
				try
					permissionCheck = parseRewrittenPermissions(abstractSqlModel, vocabulary, resourceName, permissionCheck, odataBinds)
					# We use an object with filter key to avoid collapsing our filters later.
					return filter: permissionCheck
				catch e
					console.warn('Failed to parse conditional permissions: ', permissionCheck)
					throw new PermissionParsingError(e)

			if permissionFilters is false
				throw new PermissionError()
			if permissionFilters isnt true
				permissionFilters = collapsePermissionFilters(permissionFilters)
				odataQuery.options ?= {}
				if odataQuery.options.$filter?
					odataQuery.options.$filter = ['and', odataQuery.options.$filter, permissionFilters]
				else
					odataQuery.options.$filter = permissionFilters



	exports.addPermissions = addPermissions = Promise.method (req, request) ->
		{ method, vocabulary, resourceName, permissionType, odataQuery, odataBinds } = request
		abstractSqlModel = sbvrUtils.getAbstractSqlModel(request)
		method = method.toUpperCase()
		isMetadataEndpoint = resourceName in metadataEndpoints or method is 'OPTIONS'

		permissionType ?=
			if isMetadataEndpoint
				'model'
			else if methodPermissions[method]?
				methodPermissions[method]
			else
				console.warn('Unknown method for permissions type check: ', method)
				'all'

		# This bypasses in the root cases, needed for fetching guest permissions to work, it can almost certainly be done better though
		permissions = (req.user?.permissions || []).concat(req.apiKey?.permissions || [])
		if permissions.length > 0 and checkPermissions(getPermissionsLookup(permissions), permissionType, vocabulary) is true
			# We have unconditional permission to access the vocab so there's no need to intercept anything
			return
		getReqPermissions(req, odataBinds)
		.then (permissionsLookup) ->
			# Update the request's abstract sql model to use the constrained version
			request.abstractSqlModel = abstractSqlModel = memoizedGetConstrainedModel(abstractSqlModel, permissionsLookup, vocabulary)

			if !_.isEqual(permissionType, methodPermissions.GET)
				sqlName = sbvrUtils.resolveSynonym(request)
				odataQuery.resource = "#{sqlName}$bypass"
				addODataPermissions(permissionsLookup, permissionType, vocabulary, resourceName, odataQuery, odataBinds, abstractSqlModel)




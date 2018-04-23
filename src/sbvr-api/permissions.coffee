_ = require 'lodash'
Promise = require 'bluebird'
env = require '../config-loader/env'
userModel = require './user.sbvr'
{ metadataEndpoints } = require './uri-parser'
{ BadRequestError, PermissionError, PermissionParsingError } = require './errors'
{ ODataParser } = require '@resin/odata-parser'
memoize = require 'memoizee'

try
	crypto = require('crypto')
	hashFactory = ->
		crypto.createHash('sha256')
catch
	shajs = require('sha.js')
	hashFactory = ->
		shajs('sha256')

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

parsePermissions = do ->
	odataParser = ODataParser.createInstance()
	_parsePermissions = memoize(
		(filter) ->
			# Reset binds
			odataParser.binds = []
			tree = odataParser.matchAll(['FilterByExpression', filter], 'ProcessRule')
			return {
				tree
				extraBinds: odataParser.binds
			}
		primitive: true
	)

	return (filter, odataBinds) ->
		{ tree, extraBinds } = _parsePermissions(filter)
		# Add the extra binds we parsed onto our existing list of binds vars.
		bindsLength = odataBinds.length
		odataBinds.push(extraBinds...)
		# Clone the tree so the cached version can't be mutated and at the same time fix the bind numbers
		return _.cloneDeepWith tree, (value) ->
			if value?.bind?
				return { bind: value.bind + bindsLength }

exports.hashApiKey = hashApiKey = (apiKey) ->
	hash = hashFactory()
	hash.update(apiKey)
	hashValue = hash.digest('hex')
	"SHA256:HEX:#{hashValue}"

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
)

_checkPermissions = (permissions, actorID, actionList, resourceName, vocabulary) ->
	if !actorID?
		throw new Error('Actor ID cannot be null for _checkPermissions.')

	permissions =
		if _.isArray(actorID)
			_.flatMap actorID, (id) ->
				_.map permissions, (permission) ->
					permission.replace(/\$ACTOR\.ID/g, id)
		else
			_.map permissions, (permission) ->
				permission.replace(/\$ACTOR\.ID/g, actorID)

	permissionsLookup = getPermissionsLookup(permissions)

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
		# Remove the false and undefined elements.
		conditionalPermissions = _.filter(conditionalPermissions)

		if conditionalPermissions.length is 1
			return conditionalPermissions[0]
		else if conditionalPermissions.length > 1
			return or: conditionalPermissions
		return false

exports.config =
	models: [
		apiRoot: 'Auth'
		modelText: userModel
		customServerCode: exports
	]
exports.setup = (app, sbvrUtils) ->
	sbvrUtils.addHook 'all', 'all', 'all',
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


	sbvrUtils.addHook 'POST', 'Auth', 'user',
		POSTPARSE: ({ request, api }) ->
			api.post
				resource: 'actor'
				customOptions: { returnResource: false }
			.then (result) ->
				request.values.actor = result.id

	sbvrUtils.addHook 'DELETE', 'Auth', 'user',
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
				hashedApiKey = hashApiKey(apiKey)
				permsFilter = $or:
					is_of__api_key: $any:
						$alias: 'khp'
						$expr: khp: api_key: $any:
							$alias: 'k'
							$expr: k: key: hashedApiKey
					is_of__role: $any:
						$alias: 'rhp'
						$expr: 'rhp': role: $any:
							$alias: 'r'
							$expr: r: is_of__api_key: $any:
								$alias: 'khr'
								$expr: khr: api_key: $any:
									$alias: 'k'
									$expr: k: key: hashedApiKey
				return getPermissions(permsFilter)
			primitive: true
			max: env.apiKeys.permissionsCache.max
			maxAge: env.apiKeys.permissionsCache.maxAge
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
			hashedApiKey = hashApiKey(apiKey)
			sbvrUtils.api.Auth.get
				resource: 'api_key'
				passthrough: req: rootRead
				options:
					$select: 'is_of__actor'
					$filter: key: hashedApiKey
			.then (apiKeys) ->
				if apiKeys.length is 0
					throw new Error('Could not find the api key')
				apiKeyActorID = apiKeys[0].is_of__actor.__id
				if !apiKeyActorID?
					throw new Error('API key is not linked to a actor?!')
				return apiKeyActorID
		primitive: true
		promise: true
		maxAge: env.apiKeys.permissionsCache.maxAge
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

	exports.checkPermissions = checkPermissions = do ->
		_getGuestPermissions = do ->
			# Start the guest permissions as null, having it as a reject promise either
			# causes an issue with an unhandled rejection, or with enabling long stack traces.
			_guestPermissions = null
			return (callback) ->
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
				_guestPermissions.nodeify(callback)

		# If not all optional arguments are specified, and the last one specified is a function then it is taken to be the callback.
		# req, actionList[, resourceName, vocabulary, apiKey, callback]
		return (args...) ->
			# callbackArg needs to be the index of the last optional index
			# and then if the callback is a function it should be used and nullified so that it isn't used for another arg
			callbackArg = Math.max(3, Math.min(6, args.length - 1))
			if _.isFunction(args[callbackArg])
				callback = args[callbackArg]
				args[callbackArg] = null
			[req, actionList, resourceName, vocabulary] = args
			authApi = sbvrUtils.api.Auth

			# We default to a user id of 0 (the guest user) if not logged in.
			actorID = req.user?.actor ? 0
			apiKeyActorID = false

			Promise.try ->
				if req.user?
					return _checkPermissions(req.user.permissions, actorID, actionList, resourceName, vocabulary)
				return false
			.catch (err) ->
				authApi.logger.error('Error checking user permissions', req.user, err, err.stack)
				return false
			.then (allowed) ->
				apiKeyPermissions = req.apiKey?.permissions
				if allowed is true or !apiKeyPermissions? or apiKeyPermissions.length is 0
					return allowed
				getApiKeyActorId(req.apiKey.key)
				.then (apiKeyActorID) ->
					return _checkPermissions(apiKeyPermissions, apiKeyActorID, actionList, resourceName, vocabulary)
				.catch (err) ->
					authApi.logger.error('Error checking api key permissions', req.apiKey.key, err, err.stack)
					return false
				.then (apiKeyAllowed) ->
					if apiKeyAllowed is true
						return true
					return or: [allowed, apiKeyAllowed]
			.then (allowed) ->
				if allowed is true
					return allowed
				_getGuestPermissions()
				.then (permissions) ->
					actorIDs =
						if apiKeyActorID isnt false
							[actorID, apiKeyActorID]
						else
							actorID
					return _checkPermissions(permissions, actorIDs, actionList, resourceName, vocabulary)
				.catch (err) ->
					authApi.logger.error('Error checking guest permissions', err, err.stack)
					return false
				.then (guestAllowed) ->
					return or: [allowed, guestAllowed]
			.then (permissions) ->
				# Pass through the nestedCheck with no changes to strings, this optimises any ors/ands that can be.
				nestedCheck(permissions, _.identity)
			.nodeify(callback)

	exports.checkPermissionsMiddleware = (action) ->
		return (req, res, next) ->
			checkPermissions(req, action)
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

	exports.addPermissions = addPermissions = do ->
		lambdas = {}

		collectAdditionalResources = (odataQuery) ->
			resources = collectExpand(odataQuery)
			resources = resources.concat(collectFilter(odataQuery))
			return _.compact(_.flattenDeep(resources))

		collectFilter = (odataQuery) ->
			if odataQuery.options?.$filter?
				return descendFilters(odataQuery.options.$filter)
			else return []

		collectExpand = (odataQuery) ->
			if odataQuery.options?.$expand?.properties?
				return odataQuery.options.$expand.properties
			else return []

		descendFilters = (filter) ->
			if _.isArray(filter)
				return _.map(filter, descendFilters)
			else if _.isObject(filter)
				if filter.name?
					if filter.lambda?
						lambdas[filter.lambda.identifier] = filter.name
						fakeQuery =
							name: filter.name
							options: {}
						Object.defineProperty fakeQuery.options, '$filter',
							get: ->
								return filter.lambda.expression
							set: (newValue) ->
								filter.lambda.expression = newValue
						return fakeQuery
					else if filter.property?
						if lambdas[filter.name]
							return descendFilters(filter.property)
						else
							return []
				return []

		_addPermissions = (req, permissionType, vocabulary, resourceName, odataQuery, odataBinds, abstractSqlModel) ->
			checkPermissions(req, permissionType, resourceName, vocabulary)
			.then (conditionalPerms) ->
				resources = collectAdditionalResources(odataQuery)
				if conditionalPerms is false
					throw new PermissionError()
				if conditionalPerms isnt true
					permissionFilters = nestedCheck conditionalPerms, (permissionCheck) ->
						try
							permissionCheck = parsePermissions(permissionCheck, odataBinds)
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

				# Make sure any relevant permission filters are also applied to any additional resources involved in the query.
				# Mapping in serial to make sure binds are always added in the same order/location to aid cache hits
				Promise.each resources, (resource) ->
					collectedResourceName = sbvrUtils.resolveNavigationResource({
						vocabulary
						resourceName
						abstractSqlModel
					}, resource.name)
					# Always use get for the collected resources
					_addPermissions(req, methodPermissions.GET, vocabulary, collectedResourceName, resource, odataBinds, abstractSqlModel)

		return (req, request) ->
			{ method, vocabulary, resourceName, odataQuery, odataBinds, permissionType } = request
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

			_addPermissions(req, permissionType, vocabulary, odataQuery.resource, odataQuery, odataBinds, abstractSqlModel)

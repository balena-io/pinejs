_ = require 'lodash'
Promise = require 'bluebird'
BluebirdLRU = require 'bluebird-lru-cache'
env = require '../config-loader/env'
userModel = require './user.sbvr'
{ metadataEndpoints } = require './uri-parser'
{ ODataParser } = require '@resin/odata-parser'
TypedError = require 'typed-error'

exports.PermissionError = class PermissionError extends TypedError
exports.PermissionParsingError = class PermissionParsingError extends TypedError
exports.root = user: permissions: [ 'resource.all' ]
exports.rootRead = rootRead = user: permissions: [ 'resource.get' ]
methodPermissions =
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
	(filter, odataBinds) ->
		# Continue from the existing binds as part of the partial parse pass we do.
		odataParser.binds = odataBinds
		odataParser.matchAll(['FilterByExpression', filter], 'ProcessRule')

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
			addPermissions(req, request)

	sbvrUtils.addHook 'POST', 'Auth', 'user',
		POSTPARSE: ({ request, api }) ->
			api.post
				resource: 'actor'
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
				select: ['id', 'actor', 'password']
				filter:
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
				select: 'name'
				filter: permsFilter
		.map (permission) -> permission.name
		.catch (err) ->
			authApi.logger.error('Error loading permissions', err, err.stack)
			throw err
		.nodeify(callback)

	exports.getUserPermissions = getUserPermissions = (userId, callback) ->
		if _.isString(userId)
			userId = _.parseInt(userId)
		if !_.isFinite(userId)
			return Promise.rejected(new Error('User ID has to be numeric, got: ' + typeof userId))
		permsFilter = $or:
			user__has__permission: $any:
				$alias: 'uhp'
				$expr:
					uhp: user: userId
					$or: [
						uhp: expiry_date: null
					,	uhp: expiry_date: $gt: $now: null
					]
			role__has__permission: $any:
				$alias: 'rhp'
				$expr: rhp: role: $any:
					$alias: 'r'
					$expr: r: user__has__role: $any:
						$alias: 'uhr'
						$expr:
							uhr: user: userId
							$or: [
								uhr: expiry_date: null
							,	uhr: expiry_date: $gt: $now: null
							]
		return getPermissions(permsFilter, callback)

	exports.getApiKeyPermissions = getApiKeyPermissions = do ->
		cache = new BluebirdLRU
			max: env.apiKeys.permissionsCache.max
			maxAge: env.apiKeys.permissionsCache.maxAge
			fetchFn: (apiKey) ->
				permsFilter = $or:
					api_key__has__permission: $any:
						$alias: 'khp'
						$expr: khp: api_key: $any:
							$alias: 'k'
							$expr: k: key: apiKey
					role__has__permission: $any:
						$alias: 'rhp'
						$expr: 'rhp': role: $any:
							$alias: 'r'
							$expr: r: api_key__has__role: $any:
								$alias: 'khr'
								$expr: khr: api_key: $any:
									$alias: 'k'
									$expr: k: key: apiKey
				return getPermissions(permsFilter)
		(apiKey, callback) ->
			promise =
				if _.isString(apiKey)
					cache.get(apiKey)
				else
					Promise.rejected(new Error('API key has to be a string, got: ' + typeof apiKey))
			return promise.nodeify(callback)

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
							select: 'id'
							filter:
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

			_checkPermissions = (permissions, actorID) ->
				if !actorID?
					throw new Error('Actor ID cannot be null for _checkPermissions.')
				checkObject = or: ['all', actionList]
				return nestedCheck checkObject, (permissionCheck) ->
					resourcePermission = 'resource.' + permissionCheck
					if _.includes(permissions, resourcePermission)
						return true
					if vocabulary?
						vocabularyPermission = vocabulary + '.' + permissionCheck
						if _.includes(permissions, vocabularyPermission)
							return true
						if resourceName?
							vocabularyResourcePermission = vocabulary + '.' + resourceName + '.' + permissionCheck
							if _.includes(permissions, vocabularyResourcePermission)
								return true

					conditionalPermissions = _.map permissions, (permissionName) ->
						for permission in [resourcePermission, vocabularyPermission, vocabularyResourcePermission] when permission?
							# Check if there are any matching permissions that contain a condition (condition indicated by a ? directly after the permission name).
							permission = permission + '?'
							if permissionName[...permission.length] == permission
								condition = permissionName[permission.length...]
								if _.isArray(actorID)
									return _.map actorID, (id) -> condition.replace(/\$ACTOR\.ID/g, id)
								return condition.replace(/\$ACTOR\.ID/g, actorID)
						return false
					# Remove the false elements.
					conditionalPermissions = _.filter(conditionalPermissions)

					if conditionalPermissions.length is 1
						return conditionalPermissions[0]
					else if conditionalPermissions.length > 1
						return or: conditionalPermissions
					return false

			# We default to a user id of 0 (the guest user) if not logged in.
			actorID = req.user?.actor ? 0
			apiKeyActorID = false

			Promise.try ->
				if req.user?
					return _checkPermissions(req.user.permissions, actorID)
				return false
			.catch (err) ->
				authApi.logger.error('Error checking user permissions', req.user, err, err.stack)
				return false
			.then (allowed) ->
				apiKeyPermissions = req.apiKey?.permissions
				if allowed is true or !apiKeyPermissions? or apiKeyPermissions.length is 0
					return allowed
				authApi.get
					resource: 'api_key'
					passthrough: req: rootRead
					options:
						select: 'actor'
						filter: key: req.apiKey.key
				.then (apiKeys) ->
					if apiKeys.length is 0
						throw new Error('API key is not linked to a actor?!')
					apiKeyActorID = apiKeys[0].actor.__id
					return _checkPermissions(apiKeyPermissions, apiKeyActorID)
				.catch (err) ->
					authApi.logger.error('Error checking api key permissions', req.apiKey.key, err, err.stack)
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
					return _checkPermissions(permissions, actorIDs)
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

	addPermissions = do ->
		_addPermissions = (req, permissionType, vocabulary, resourceName, odataQuery, odataBinds) ->
			checkPermissions(req, permissionType, resourceName, vocabulary)
			.then (conditionalPerms) ->
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

				if odataQuery.options?.$expand?.properties?
					# Make sure any relevant permission filters are also applied to expands.
					Promise.map odataQuery.options.$expand.properties, (expand) ->
						# Always use get for the $expands
						_addPermissions(req, methodPermissions.GET, vocabulary, expand.name, expand)

		return (req, { method, vocabulary, resourceName, odataQuery, odataBinds, values, custom }) ->
			method = method.toUpperCase()
			isMetadataEndpoint = resourceName in metadataEndpoints or method is 'OPTIONS'

			permissionType =
				if isMetadataEndpoint
					'model'
				else if methodPermissions[method]?
					methodPermissions[method]
				else
					console.warn('Unknown method for permissions type check: ', method)
					'all'

			_addPermissions(req, permissionType, vocabulary, odataQuery.resource, odataQuery, odataBinds)

define [
	'exports'
	'lodash'
	'bluebird'
], (exports, _, Promise) ->

	if ENV_NODEJS
		BluebirdLRU = require 'bluebird-lru-cache'
	else
		# A very basic, always refetch, implementation for the case of running in-browser.
		class BluebirdLRU
			constructor: ({fetchFn}) ->
				@get = fetchFn

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
					results.push(result)
			if results.length is 1
				return results[0]
			else if results.length > 1
				return results
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
							results.push(result)
					if results.length is 1
						return results[0]
					else if results.length > 1
						return or: results
					else
						return false
				else
					throw new Error('Cannot parse required checking logic: ' + checkType)
		else
			throw new Error('Cannot parse required checks: ' + check)

	exports.setup = (app, sbvrUtils) ->

		exports.checkPassword = (username, password, callback) ->
			authApi = sbvrUtils.api.Auth
			authApi.get(
				resource: 'user'
				options:
					select: ['id', 'password']
					filter:
						username: username
			).then (result) ->
				if result.length is 0
					throw new Error('User not found')
				hash = result[0].password
				userId = result[0].id
				sbvrUtils.sbvrTypes.Hashed.compare(password, hash)
				.then (res) ->
					if !res
						throw new Error('Passwords do not match')
					getUserPermissions(userId)
					.then (permissions) ->
						return {
							id: userId
							username: username
							permissions: permissions
						}
			.nodeify(callback)

		getPermissions = (permsFilter, roleFilter, callback) ->
			authApi = sbvrUtils.api.Auth
			userPerms = authApi.get(
				resource: 'permission'
				options:
					select: 'name'
					filter: permsFilter
			)
			rolePerms = authApi.get(
				resource: 'permission'
				options:
					select: 'name'
					filter: role__has__permission: role: roleFilter
			)
			# TODO: Combine these into one api call.
			Promise.all([
				userPerms
				rolePerms
			]).spread (userPermissions, rolePermissions) ->
				allPermissions = []
				for permission in userPermissions
					allPermissions.push(permission.name)
				for permission in rolePermissions
					allPermissions.push(permission.name)

				return _.unique(allPermissions)
			.catch (err) ->
				authApi.logger.error('Error loading permissions', err, err.stack)
				throw err
			.nodeify(callback)

		exports.getUserPermissions = getUserPermissions = (userId, callback) ->
			if _.isFinite(userId)
				permsFilter = user__has__permission: user: userId
				roleFilter = user__has__role: user: userId
				return getPermissions(permsFilter, roleFilter, callback)
			else
				return Promise.rejected(new Error('User ID either has to be a numeric id, got: ' + typeof userId))

		exports.getApiKeyPermissions = getApiKeyPermissions = do ->
			# TODO: Allow the max/maxAge settings to be easily customised.
			cache = new BluebirdLRU
				max: 50
				maxAge: 5 * 60 * 1000
				fetchFn: (apiKey) ->
					permsFilter = api_key__has__permission: api_key: key: apiKey
					roleFilter = api_key__has__role: api_key: key: apiKey
					return getPermissions(permsFilter, roleFilter)
			(apiKey, callback) ->
				promise =
					if _.isString(apiKey)
						cache.get(apiKey)
					else
						Promise.rejected(new Error('API key has to be a string, got: ' + typeof apiKey))
				return promise.nodeify(callback)

		exports.customApiKeyMiddleware = customApiKeyMiddleware = (paramName = 'apikey') ->
			return (req, res, next) ->
				Promise.try ->
					apiKey = req.param(paramName)
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
				.then ->
					next?()
					return

		# A default api key middleware for convenience
		exports.apiKeyMiddleware = customApiKeyMiddleware()

		exports.checkPermissions = checkPermissions = do ->
			_getGuestPermissions = do ->
				# Start the guest permissions as null, having it as a reject promise either
				# causes an issue with an unhandled rejection, or with enabling long stack traces.
				_guestPermissions = null
				return (callback) ->
					if !_guestPermissions? or _guestPermissions.isRejected()
						# Get guest user
						_guestPermissions = sbvrUtils.api.Auth.get(
							resource: 'user'
							options:
								select: 'id'
								filter:
									username: 'guest'
						).then (result) ->
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

				_checkPermissions = (permissions, userID) ->
					if !userID?
						throw new Error('User ID cannot be null for _checkPermissions.')
					checkObject = or: ['all', actionList]
					return nestedCheck checkObject, (permissionCheck) ->
						resourcePermission = 'resource.' + permissionCheck
						if _.contains(permissions, resourcePermission)
							return true
						if vocabulary?
							vocabularyPermission = vocabulary + '.' + permissionCheck
							if _.contains(permissions, vocabularyPermission)
								return true
							if resourceName?
								vocabularyResourcePermission = vocabulary + '.' + resourceName + '.' + permissionCheck
								if _.contains(permissions, vocabularyResourcePermission)
									return true

						conditionalPermissions = _.map permissions, (permissionName) ->
							for permission in [resourcePermission, vocabularyPermission, vocabularyResourcePermission] when permission?
								# Check if there are any matching permissions that contain a condition (condition indicated by a ? directly after the permission name).
								permission = permission + '?'
								if permissionName[...permission.length] == permission
									condition = permissionName[permission.length...]
									if _.isArray(userID)
										return _.map userID, (id) -> condition.replace(/\$USER\.ID/g, id)
									return condition.replace(/\$USER\.ID/g, userID)
							return false
						# Remove the false elements.
						conditionalPermissions = _.filter(conditionalPermissions)

						if conditionalPermissions.length is 1
							return conditionalPermissions[0]
						else if conditionalPermissions.length > 1
							return or: conditionalPermissions
						return false

				# We default to a user id of 0 (the guest user) if not logged in.
				userID = req.user?.id ? 0
				apiKeyUserID = false

				Promise.try ->
					if req.user?
						return _checkPermissions(req.user.permissions, userID)
					return false
				.catch (err) ->
					authApi.logger.error('Error checking user permissions', req.user, err, err.stack)
					return false
				.then (allowed) ->
					apiKeyPermissions = req.apiKey?.permissions
					if allowed is true or !apiKeyPermissions? or apiKeyPermissions.length is 0
						return allowed
					authApi.get(
						resource: 'user'
						options:
							select: 'id'
							filter: 
								api_key:
									key: req.apiKey.key
					)
					.then (user) ->
						if user.length is 0
							throw new Error('API key is not linked to a user?!')
						apiKeyUserID = user[0].id
						return _checkPermissions(apiKeyPermissions, apiKeyUserID)
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
						userIDs =
							if apiKeyUserID isnt false
								[userID, apiKeyUserID]
							else
								userID
						return _checkPermissions(permissions, userIDs)
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
							res.send(401)
						when true
							next()
						else
							throw new Error('checkPermissionsMiddleware returned a conditional permission')
				.catch (err) ->
					sbvrUtils.api.Auth.logger.error('Error checking permissions', err, err.stack)
					res.send(503)

	return exports

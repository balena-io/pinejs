define [
	'exports'
	'lodash'
	'bluebird'
	'cs!sbvr-api/sbvr-utils'
], (exports, _, Promise, sbvrUtils) ->

	exports.getUserPermissions = getUserPermissions = (userId, callback) ->
		if _.isFinite(userId)
			# We have a user id
			userPerms = sbvrUtils.runURI('GET', '/Auth/permission?$select=name&$filter=user__has__permission/user eq ' + userId)
			userRole = sbvrUtils.runURI('GET', '/Auth/permission?$select=name&$filter=role__has__permission/role/user__has__role/user eq ' + userId)
		else if _.isString(userId)
			# We have an API key
			userPerms = sbvrUtils.runURI('GET', "/Auth/permission?$select=name&$filter=api_key__has__permission/api_key/key eq '" + encodeURIComponent(userId) + "'")
			userRole = sbvrUtils.runURI('GET', "/Auth/permission?$select=name&$filter=role__has__permission/role/api_key__has__role/api_key/key eq '" + encodeURIComponent(userId) + "'")
		else
			return Promise.rejected(new Error('User ID either has to be a numeric id or an api key string, got: ' + typeof userId))

		Promise.all([
			userPerms
			userRole
		]).spread((userPermissions, rolePermissions) ->
			allPermissions = []
			for permission in userPermissions.d
				allPermissions.push(permission.name)
			for permission in rolePermissions.d
				allPermissions.push(permission.name)

			return _.unique(allPermissions)
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
					_guestPermissions = sbvrUtils.runURI('GET', "/Auth/user?$select=id&$filter=user/username eq 'guest'")
					.then((result) ->
						if result.d.length is 0
							throw new Error('No guest permissions')
						getUserPermissions(result.d[0].id)
					)
				_guestPermissions.nodeify(callback)

		# If not all optional arguments are specified, and the last one specified is a function then it is taken to be the callback.
		# req, res, actionList[, resourceName, vocabulary, apiKey, callback]
		return (args...) ->
			# callbackArg needs to be the index of the last optional index
			# and then if the callback is a function it should be used and nullified so that it isn't used for another arg
			callbackArg = Math.max(3, Math.min(6, args.length - 1))
			if _.isFunction(args[callbackArg])
				callback = args[callbackArg]
				args[callbackArg] = null
			[req, res, actionList, resourceName, vocabulary, apiKey] = args

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

			Promise.try(->
				if req.user?
					return _checkPermissions(req.user.permissions)
				return false
			).catch((err) ->
				console.error('Error checking user permissions', req.user, err, err.stack)
				return false
			).then((allowed) ->
				if !apiKey? or allowed is true
					return allowed
				getUserPermissions(apiKey)
				.then((apiKeyPermissions) ->
					return _checkPermissions(apiKeyPermissions)
				).catch((err) ->
					console.error('Error checking api key permissions', apiKey, err, err.stack)
				).then((apiKeyAllowed) ->
					if allowed is false or apiKeyAllowed is true
						return apiKeyAllowed
					return '(' + allowed + ' or ' + apiKeyAllowed + ')'
				)
			).then((allowed) ->
				if allowed is true
					return allowed
				_getGuestPermissions()
				.then((permissions) ->
					return _checkPermissions(permissions)
				).catch((err) ->
					console.error('Error checking guest permissions', err, err.stack)
					return false
				).then((guestAllowed) ->
					if allowed is false or guestAllowed is true
						return guestAllowed
					return '(' + allowed + ' or ' + guestAllowed + ')'
				)
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

	return exports

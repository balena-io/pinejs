define [
	'require'
	'exports'
	'lodash'
	'bluebird'
	'cs!sbvr-api/sbvr-utils'
], (require, exports, _, Promise, sbvrUtils) ->
	authAPI = null
	# Due to the circular dependency we can't immediately access the sbvr-utils properties, so putting it in a timeout to run ASAP after this module returns.
	# TODO: Find a better way of achieving this with requirejs
	setTimeout -> authAPI = new require('cs!sbvr-api/sbvr-utils').PlatformAPI('/Auth/')

	exports.nestedCheck = nestedCheck = (check, stringCallback) ->
		if _.isString(check)
			stringCallback(check)
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

	exports.checkPassword = (username, password, callback) ->
		authAPI.get(
			resource: 'user'
			options:
				select: ['id', 'password']
				filter: "user/username eq '" + encodeURIComponent(username) + "'"
		).then((result) ->
			if result.length is 0
				throw new Error('User not found')
			hash = result[0].password
			userId = result[0].id
			sbvrUtils.sbvrTypes.Hashed.compare(password, hash)
			.then((res) ->
				if !res
					throw new Error('Passwords do not match')
				getUserPermissions(userId)
				.then((permissions) ->
					return {
						id: userId
						username: username
						permissions: permissions
					}
				)
			)
		).nodeify(callback)

	exports.getUserPermissions = getUserPermissions = (userId, callback) ->
		if _.isFinite(userId)
			# We have a user id
			userPermsFilter = 'user__has__permission/user eq ' + userId
			userRoleFilter = 'role__has__permission/role/user__has__role/user eq ' + userId
		else if _.isString(userId)
			# We have an API key
			userPermsFilter = "api_key__has__permission/api_key/key eq '" + encodeURIComponent(userId) + "'"
			userRoleFilter = "role__has__permission/role/api_key__has__role/api_key/key eq '" + encodeURIComponent(userId) + "'"
		else
			return Promise.rejected(new Error('User ID either has to be a numeric id or an api key string, got: ' + typeof userId))

		userPerms = authAPI.get(
			resource: 'permission'
			options:
				select: 'name'
				filter: userPermsFilter
		)
		userRole = authAPI.get(
			resource: 'permission'
			options:
				select: 'name'
				filter: userRoleFilter
		)
		Promise.all([
			userPerms
			userRole
		]).spread((userPermissions, rolePermissions) ->
			allPermissions = []
			for permission in userPermissions
				allPermissions.push(permission.name)
			for permission in rolePermissions
				allPermissions.push(permission.name)

			return _.unique(allPermissions)
		).catch((err) ->
			console.error('Error loading permissions', err, err.stack)
			throw err
		).nodeify(callback)

	exports.checkPermissions = checkPermissions = do ->
		_getGuestPermissions = do ->
			# Start the guest permissions as null, having it as a reject promise either
			# causes an issue with an unhandled rejection, or with enabling long stack traces.
			_guestPermissions = null
			return (callback) ->
				if !_guestPermissions? or _guestPermissions.isRejected()
					# Get guest user
					_guestPermissions = authAPI.get(
						resource: 'user'
						options:
							select: 'id'
							filter: "username eq 'guest'"
					).then((result) ->
						if result.length is 0
							throw new Error('No guest permissions')
						getUserPermissions(result[0].id)
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
									return _.map userID, (id) -> condition.replace(/\$USER\.ID/g, userID)
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

			Promise.try(->
				if req.user?
					return _checkPermissions(req.user.permissions, userID)
				return false
			).catch((err) ->
				console.error('Error checking user permissions', req.user, err, err.stack)
				return false
			).then((allowed) ->
				if !apiKey? or allowed is true
					return allowed
				Promise.all([
					getUserPermissions(apiKey)
					authAPI.get(
						resource: 'api_key'
						options:
							select: 'id'
							expand: 'user'
							filter: "key eq '" + encodeURIComponent(apiKey) + "'"
					)
				])
				.spread((apiKeyPermissions, user) ->
					if user.d.length is 0
						throw new Error('API key is not linked to a user?!')
					apiKeyUserID = user.d[0].id
					return _checkPermissions(apiKeyPermissions, apiKeyUserID)
				).catch((err) ->
					console.error('Error checking api key permissions', apiKey, err, err.stack)
				).then((apiKeyAllowed) ->
					if allowed is false or apiKeyAllowed is true
						return apiKeyAllowed
					return or: [allowed, apiKeyAllowed]
				)
			).then((allowed) ->
				if allowed is true
					return allowed
				_getGuestPermissions()
				.then((permissions) ->
					userIDs =
						if apiKeyUserID isnt false
							[userID, apiKeyUserID]
						else
							userID
					return _checkPermissions(permissions, userIDs)
				).catch((err) ->
					console.error('Error checking guest permissions', err, err.stack)
					return false
				).then((guestAllowed) ->
					if allowed is false or guestAllowed is true
						return guestAllowed
					return or: [allowed, guestAllowed]
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

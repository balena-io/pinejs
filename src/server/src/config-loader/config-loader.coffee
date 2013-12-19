define [
	'exports'
	'has'
	'lodash'
	'bluebird'
	'cs!sbvr-api/sbvr-utils'
], (exports, has, _, Promise, sbvrUtils) ->
	# Setup function
	exports.setup = (app, requirejs) ->
		loadConfig = (data) ->
			sbvrUtils.db.transaction().then (tx) ->
				modelsPromise = Promise.map data.models, (model) ->
					sbvrUtils.executeModel(tx, model.apiRoot, model.modelText)
					.then ->
						console.info('Sucessfully executed ' + model.modelName + ' model.')
					.catch (err) ->
						throw new Error(['Failed to execute ' + model.modelName + ' model from ' + model.modelFile, err])

				if data.users?
					permissions = {}
					for user in data.users when user.permissions?
						_.each user.permissions, (permissionName) ->
							permissions[permissionName] ?=
								sbvrUtils.runURI('GET', "/Auth/permission?$select=id&$filter=name eq '" + encodeURIComponent(permissionName) + "'", null, tx)
								.then (result) ->
									if result.d.length is 0
										sbvrUtils.runURI('POST', '/Auth/permission', {'name': permissionName}, tx)
										.get('id')
									else
										return result.d[0].id
								.catch (err) ->
									throw new Error('Could not create or find permission "' + permissionName + '": ' + err)

					usersPromise = Promise.map data.users, (user) ->
						sbvrUtils.runURI('GET', "/Auth/user?$select=id&$filter=username eq '" + encodeURIComponent(user.username) + "'", null, tx)
						.then (result) ->
							if result.d.length is 0
								sbvrUtils.runURI('POST', '/Auth/user', {'username': user.username, 'password': user.password}, tx)
								.get('id')
							else
								return result.d[0].id
						.then (userID) ->
							Promise.map user.permissions, (permissionName) ->
								permissions[permissionName].then (permissionID) ->
									sbvrUtils.runURI('GET', "/Auth/user__has__permission?$select=id&$filter=user eq '" + userID + "' and permission eq '" + permissionID + "'", null, tx)
									.then (result) ->
										if result.d.length is 0
											sbvrUtils.runURI('POST', '/Auth/user__has__permission', {'user': userID, 'permission': permissionID}, tx)
						.catch (err) ->
							throw new Error('Could not create or find user "' + user.username + '": ' + err)
				Promise.all([modelsPromise, usersPromise])
				.catch (err) ->
					tx.rollback()
					throw err
				.then ->
					tx.end()
					Promise.map data.models, (model) ->
						apiRoute = '/' + model.apiRoot + '/*'
						app.get(apiRoute, sbvrUtils.runGet)

						app.post(apiRoute, sbvrUtils.runPost)

						app.put(apiRoute, sbvrUtils.runPut)

						app.patch(apiRoute, sbvrUtils.runPut)

						app.merge(apiRoute, sbvrUtils.runPut)

						app.del(apiRoute, sbvrUtils.runDelete)
						if model.customServerCode?
							try
								deferred = Promise.pending()
								promise = require(model.customServerCode).setup app, requirejs, sbvrUtils, sbvrUtils.db, (err) ->
									if err
										deferred.reject(err)
									else
										deferred.fulfill()
								if Promise.is(promise)
									deferred.fulfill(promise)
								return deferred.promise
							catch e
								throw new Error('Error running custom server code: ' + e)

		loadNodeConfig = ->
			if not has 'ENV_NODEJS'
				console.error('Can only load a node config in a nodejs environment.')
				return
			require('coffee-script')
			readFile = Promise.promisify(require('fs').readFile)
			path = require('path')
			root = process.argv[2] or __dirname
			console.info('loading config.json')
			config = require path.join(root, 'config.json')
			Promise.map config.models, (model) ->
				readFile(path.join(root, model.modelFile), 'utf8')
				.then (sbvrModel) ->
					model.modelText = sbvrModel
					if model.customServerCode?
						model.customServerCode = root + '/' + model.customServerCode
			.then ->
				loadConfig(config)
			.catch (err) ->
				console.error('Error loading config', err, err.stack)
				process.exit()

		return {
			loadConfig
			loadNodeConfig
		}

	return exports

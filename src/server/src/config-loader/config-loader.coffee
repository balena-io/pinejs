define ['has', 'lodash', 'bluebird'], (has, _, Promise) ->
	exports = {}

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, db) ->
		if not has 'ENV_NODEJS'
			console.error('Config loader only works in a nodejs environment.')
			return
		require('coffee-script')
		fs = require('fs')
		path = require('path')
		root = process.argv[2] or __dirname
		console.info('loading config.json')
		data = require path.join(root, 'config.json')
		db.transaction().then((tx) ->
			modelsPromise = Promise.all(_.map data.models, (model) ->
				Promise.promisify(fs.readFile)(path.join(root, model.modelFile), 'utf8')
				.then((sbvrModel) ->
					sbvrUtils.executeModel(tx, model.apiRoot, sbvrModel)
				).then(->
					console.info('Sucessfully executed ' + model.modelName + ' model.')
				).catch((err) ->
					throw new Error(['Failed to execute ' + model.modelName + ' model from ' + model.modelFile, err])
				)
			)

			if data.users?
				permissions = {}
				for user in data.users when user.permissions?
					_.each user.permissions, (permissionName) ->
						permissions[permissionName] ?=
							sbvrUtils.runURI('GET', "/Auth/permission?$filter=name eq '" + encodeURIComponent(permissionName) + "'", null, tx)
							.then((result) ->
								if result.d.length is 0
									sbvrUtils.runURI('POST', '/Auth/permission', {'name': permissionName}, tx)
									.get('id')
								else
									return result.d[0].id
							).catch((err) ->
								throw new Error('Could not create or find permission "' + permissionName + '": ' + err)
							)

				usersPromise = Promise.all(_.map data.users, (user) ->
					sbvrUtils.runURI('GET', "/Auth/user?$filter=username eq '" + encodeURIComponent(user.username) + "'", null, tx)
					.then((result) ->
						if result.d.length is 0
							sbvrUtils.runURI('POST', '/Auth/user', {'username': user.username, 'password': user.password}, tx)
							.get('id')
						else
							return result.d[0].id
					).then((userID) ->
						Promise.all(_.map user.permissions, (permissionName) ->
							permissions[permissionName].then((permissionID) ->
								sbvrUtils.runURI('GET', "/Auth/user__has__permission?$filter=user eq '" + userID + "' and permission eq '" + permissionID + "'", null, tx)
								.then((result) ->
									if result.d.length is 0
										sbvrUtils.runURI('POST', '/Auth/user__has__permission', {'user': userID, 'permission': permissionID}, tx)
								)
							)
						)
					).catch((err) ->
						throw new Error('Could not create or find user "' + user.username + '": ' + err)
					)
				)
			Promise.all([modelsPromise, usersPromise])
			.catch((err) ->
				tx.rollback()
				throw err
			).then(->
				tx.end()
			).then(->
				Promise.all(_.map data.models, (model) ->
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
							promise = require(root + '/' + model.customServerCode).setup app, requirejs, sbvrUtils, db, (err) ->
								if err
									deferred.reject(err)
								else
									deferred.fulfill()
							if Promise.is(promise)
								deferred.fulfill(promise)
							return deferred.promise
						catch e
							throw new Error('Error running custom server code: ' + e)
				)
			)
		).catch((err) ->
			console.error('Error loading config', err, err.stack)
			process.exit()
		)
	return exports

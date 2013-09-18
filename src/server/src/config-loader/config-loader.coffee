define ['has', 'async', 'lodash'], (has, async, _) ->
	exports = {}

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, db, done) ->
		if not has 'ENV_NODEJS'
			console.error('Config loader only works in a nodejs environment.')
			return
		require('coffee-script')
		fs = require('fs')
		path = require('path')
		root = process.argv[2] or __dirname
		console.info('loading config.json')
		data = require path.join(root, 'config.json')
		async.parallel [
			(callback) ->
				async.each data.models,
					(model, callback) ->
						fs.readFile path.join(root, model.modelFile), 'utf8', (err, sbvrModel) ->
							if err
								console.error('Unable to load ' + model.modelName + ' model from ' + model.modelFile, err)
								process.exit()
							db.transaction (tx) ->
								sbvrUtils.executeModel tx, model.apiRoot, sbvrModel, (err) ->
									if err
										console.error('Failed to execute ' + model.modelName + ' model.', err)
										process.exit()
									tx.end()
									apiRoute = '/' + model.apiRoot + '/*'
									app.get(apiRoute, sbvrUtils.runGet)

									app.post(apiRoute, sbvrUtils.runPost)

									app.put(apiRoute, sbvrUtils.runPut)

									app.patch(apiRoute, sbvrUtils.runPut)

									app.merge(apiRoute, sbvrUtils.runPut)

									app.del(apiRoute, sbvrUtils.runDelete)
									
									if model.customServerCode?
										try
											require(root + '/' + model.customServerCode).setup(app, requirejs, sbvrUtils, db)
										catch e
											console.error('Error running custom server code: ' + e)
											process.exit()

									console.info('Sucessfully executed ' + model.modelName + ' model.')
									callback()
					callback
			(callback) ->
				if !data.users?
					callback()
					return
				permissions = []
				for user in data.users
					if user.permissions?
						permissions = permissions.concat(user.permissions)
				permissions = _.uniq(permissions)

				db.transaction (tx) ->
					async.parallel({
						users: (callback) ->
							async.map(data.users,
								(user, callback) ->
									sbvrUtils.runURI('GET', "/Auth/user?$filter=username eq '" + encodeURIComponent(user.username) + "'", null, tx)
									.then((result) ->
										if result.d.length is 0
											sbvrUtils.runURI('POST', '/Auth/user', {'username': user.username, 'password': user.password}, null, tx)
											.get('id')
										else
											return result.d[0].id
									).catch((err) ->
										throw 'Could not create or find user "' + user.username + '": ' + err
									).nodeify(callback)
								callback
							)

						permissions: (callback) ->
							async.map(permissions,
								(permission, callback) ->
									sbvrUtils.runURI('GET', "/Auth/permission?$filter=name eq '" + encodeURIComponent(permission) + "'", null, tx)
									.then((result) ->
										if result.d.length is 0
											sbvrUtils.runURI('POST', '/Auth/permission', {'name': permission}, null, tx)
											.get('id')
										else
											return result.d[0].id
									).catch((err) ->
										throw 'Could not create or find permission "' + permission + '": ' + err
									).nodeify(callback)
								(err, permissionIDs) ->
									if err
										callback(err)
									else
										callback(null, _.zipObject(permissions, permissionIDs))
							)
					},

					(err, results) ->
						if err
							console.error('Failed to add users or permissions', err)
							process.exit()
						async.each(_.zip(results.users, data.users),
							([userID, {permissions: userPermissions}], callback) ->
								if !userPermissions?
									callback()
									return
								async.each(userPermissions,
									(permission, callback) ->
										permissionID = results.permissions[permission]
										sbvrUtils.runURI('GET', "/Auth/user__has__permission?$filter=user eq '" + userID + "' and permission eq '" + permissionID + "'", null, tx)
										.then((result) ->
											if result.d.length is 0
												sbvrUtils.runURI('POST', '/Auth/user__has__permission', {'user': userID, 'permission': permissionID}, null, tx)
										).nodeify(callback)
									callback
								)
							(err) ->
								if err
									console.error('Failed to add user permissions', err)
									process.exit()
								tx.end()
								callback()
						)
					)
		], done
	return exports

define ['has', 'async', 'lodash', 'q'], (has, async, _, Q) ->
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
					userPromises = Q.all(_.map data.users, (user) ->
						return sbvrUtils.runURI('GET', "/Auth/user?$filter=username eq '" + encodeURIComponent(user.username) + "'", null, tx)
							.then((result) ->
								if result.d.length is 0
									sbvrUtils.runURI('POST', '/Auth/user', {'username': user.username, 'password': user.password}, null, tx)
									.get('id')
								else
									return result.d[0].id
							).catch((err) ->
								throw 'Could not create or find user "' + user.username + '": ' + err
							)
					).then((users) ->
						_.zip(users, data.users)
					)
					permissionPromises = Q.all(_.map permissions, (permission) ->
						return sbvrUtils.runURI('GET', "/Auth/permission?$filter=name eq '" + encodeURIComponent(permission) + "'", null, tx)
							.then((result) ->
								if result.d.length is 0
									sbvrUtils.runURI('POST', '/Auth/permission', {'name': permission}, null, tx)
									.get('id')
								else
									return result.d[0].id
							).catch((err) ->
								throw 'Could not create or find permission "' + permission + '": ' + err
							)
					).then((permissionIDs) ->
						return _.zipObject(permissions, permissionIDs)
					)

					Q
					.all([userPromises, permissionPromises])
					.spread((users, permissions) ->
						Q.all _.map users, ([userID, {permissions: userPermissions}]) ->
							if !userPermissions?
								return
							Q.all _.map userPermissions, (permission) ->
								permissionID = permissions[permission]
								return sbvrUtils.runURI('GET', "/Auth/user__has__permission?$filter=user eq '" + userID + "' and permission eq '" + permissionID + "'", null, tx)
									.then (result) ->
										if result.d.length is 0
											sbvrUtils.runURI('POST', '/Auth/user__has__permission', {'user': userID, 'permission': permissionID}, null, tx)
					)
					.then((err) ->
						tx.end()
						callback()
					)
					.catch((err) ->
						console.error('Failed to add users or permissions', err)
						process.exit()
					)
		], done
	return exports

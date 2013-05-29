define(['has', 'async'], (has, async) ->
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
		fs.readFile(path.join(root, 'config.json'), 'utf8', (err, data) ->
			if err
				console.error('Error loading config.json', err)
			else
				data = JSON.parse(data)
				
				for model in data.models
					do (model) ->
						fs.readFile(path.join(root, model.modelFile), 'utf8', (err, sbvrModel) ->
							if err
								console.error('Unable to load ' + model.modelName + ' model from ' + model.modelFile, err)
							else
								db.transaction( (tx) ->
									sbvrUtils.executeModel(tx, model.apiRoot, sbvrModel, (err) ->
										if err
											console.error('Failed to execute ' + model.modelName + ' model.', err)
											process.exit()
											return
										apiRoute = '/' + model.apiRoot + '/*'
										app.get(apiRoute, sbvrUtils.parseURITree, (req, res, next) ->
											sbvrUtils.runGet(req, res)
										)

										app.post(apiRoute, sbvrUtils.parseURITree, (req, res, next) ->
											sbvrUtils.runPost(req, res)
										)

										app.put(apiRoute, sbvrUtils.parseURITree, (req, res, next) ->
											sbvrUtils.runPut(req, res)
										)

										app.patch(apiRoute, sbvrUtils.parseURITree, (req, res, next) ->
											sbvrUtils.runPut(req, res)
										)

										app.merge(apiRoute, sbvrUtils.parseURITree, (req, res, next) ->
											sbvrUtils.runPut(req, res)
										)

										app.del(apiRoute, sbvrUtils.parseURITree, (req, res, next) ->
											sbvrUtils.runDelete(req, res)
										)
										
										if model.customServerCode?
											try
												require(root + '/' + model.customServerCode).setup(app, requirejs, sbvrUtils, db)
											catch e
												console.error('Error running custom server code: ' + e)
												process.exit()

										console.info('Sucessfully executed ' + model.modelName + ' model.')
									)
								)
						)
				
				if data.users?
					db.transaction (tx) ->
						async.forEach(data.users,
							(user, callback) ->
								async.parallel({
										user: (callback) ->
											sbvrUtils.runURI('POST', '/Auth/user', {'username': user.username, 'password': user.password}, tx, (err, result) ->
												if err
													callback(err)
												else
													callback(null, result.id)
											)
										permissions: (callback) ->
											if !user.permissions?
												return callback(null, [])
											async.map(user.permissions,
												(permission, callback) ->
													sbvrUtils.runURI('POST', '/Auth/permission', {'name': permission}, tx, (err, result) ->
														if err
															sbvrUtils.runURI('GET', "/Auth/permission?$filter=name eq '" + permission + "'", null, tx, (err, result) ->
																if err
																	callback(err)
																else
																	callback(null, result.d[0].id)
															)
														else
															callback(null, result.id)
													)
												callback
											)
									}
									(err, results) ->
										if err
											console.error('Failed to add users or permissions', err)
										else
											async.forEach(results.permissions,
												(permission, callback) ->
													sbvrUtils.runURI('POST', '/Auth/user__has__permission', {'user': results.user, 'permission': permission}, tx, callback)
												(err) ->
													if err
														console.error('Failed to add user permissions', err)
											)
								)
						)
		)
	return exports
)

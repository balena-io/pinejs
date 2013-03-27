define(['has', 'async'], (has, async) ->
	exports = {}

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, db) ->
		if not has 'ENV_NODEJS'
			console.error('Config loader only works in a nodejs environment.')
			return
		console.error('loading config.json')
		require('coffee-script')
		fs = require('fs')
		path = require('path')
		root = process.argv[1] or __dirname
		fs.readFile(path.join(root, 'config.json'), 'utf8', (err, data) ->
			if err
				console.error('Error loading config.json')
			else
				data = JSON.parse(data)
				
				for model in data.models
					do (model) ->
						fs.readFile(path.join(root, model.modelFile), 'utf8', (err, sbvrModel) ->
							if err
								console.error('Unable to load ' + model.modelName + ' model from ' + model.modelFile)
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

										app.del(apiRoute, sbvrUtils.parseURITree, (req, res, next) ->
											sbvrUtils.runDelete(req, res)
										)
										
										if model.customServerCode?
											require(root + '/' + model.customServerCode).setup(app, requirejs, sbvrUtils, db)
										console.log('Sucessfully executed ' + model.modelName + ' model.')
									)
								)
						)
				
				if data.users?
					async.forEach(data.users,
						(user, callback) ->
							async.parallel({
									user: (callback) ->
										sbvrUtils.runURI('POST', '/Auth/user', {'username': user.username, 'password': user.password}, null, (err, result) ->
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
												sbvrUtils.runURI('POST', '/Auth/permission', {'name': 'resource.all'}, null, (err, result) ->
													if err
														sbvrUtils.runURI('GET', '/Auth/permission', {'name': 'resource.all'}, null, (err, result) ->
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
												sbvrUtils.runURI('POST', '/Auth/user__has__permission', {'user': results.user, 'permission': permission}, null, callback)
											(err) ->
												if err
													console.error('Failed to add user permissions', err)
										)
							)
					)
		)
	return exports
)

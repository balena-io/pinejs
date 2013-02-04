define(['has', 'cs!database-layer/db'], (has, dbModule) ->
	exports = {}

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, isAuthed, databaseOptions) ->
		if not has 'ENV_NODEJS'
			console.error('Config loader only works in a nodejs environment.')
			return
		console.error('loading config.json')
		require('coffee-script')
		fs = require('fs')
		fs.readFile('config.json', 'utf8', (err, data) ->
			if err
				console.error('Error loading config.json')
			else
				data = JSON.parse(data)
				console.error('data', data)
				
				db = dbModule.connect(databaseOptions)
				
				for model in data.models
					do (model) ->
						fs.readFile(model.modelFile, 'utf8', (err, sbvrModel) ->
							if err
								console.error('Unable to load ' + model.modelName + ' model from ' + model.modelFile)
							else
								db.transaction( (tx) ->
									sbvrUtils.executeModel(tx, model.apiRoot, sbvrModel,
										() ->
											console.log('Sucessfully executed ' + model.modelName + ' model.')
										(tx, error) ->
											console.error('Failed to execute ' + model.modelName + ' model.', error)
									)
								)
								
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
									code = require(__dirname + '/' + model.customServerCode).setup(app, requirejs, sbvrUtils, db)
						)
				
				
				
		)
	return exports
)

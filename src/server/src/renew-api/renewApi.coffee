define(['cs!database-layer/db'], (dbModule) ->
	exports = {}

	renewApiModel = '''
	'''

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, isAuthed, databaseOptions) ->
		db = dbModule.connect(databaseOptions)

		db.transaction( (tx) ->
			sbvrUtils.executeModel(tx, 'renewApi', renewApiModel,
				->
					console.log('Sucessfully executed Renew API model.')
				(tx, error) ->
					console.error('Failed to execute Renew API model.', error)
			)
		)

		app.get('/renewApi/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
		)

		app.post('/renewApi/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPost(req, res)
		)

		app.put('/renewApi/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPut(req, res)
		)

		app.del('/renewApi/*', sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runDelete(req, res)
		)

	return exports
)

define(['backbone', 'cs!models/sbvrmodel'], (Backbone, SBVRModel) ->
	Router = Backbone.Router.extend(
		routes:
			'models/:slug': 'modelController'
		modelController: (slug) ->
			model = new SBVRModel({slug})
			model.fetch(
				success: ->
					console.log('Model fetched!')
			)
	)
	app = new Router()
	Backbone.history.start()
	return app
)

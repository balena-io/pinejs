define(['backbone', 'cs!models/sbvrmodel', 'cs!sandbox'], (Backbone, SBVRModel, sandbox) ->
	Router = Backbone.Router.extend(
		routes:
			':slug': 'getModel'
		getModel: (slug) ->
			model = new SBVRModel({id: slug})
			model.fetch(
				success: ->
					sandbox.trigger("modelchange", model)
			)
	)
	app = new Router()
	Backbone.history.start()
	return app
)

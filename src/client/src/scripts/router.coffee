define(["backbone"], (Backbone) ->
	Router = Backbone.Router.extend(
		routes:
			"trolo": "home"
		home: ->
			console.log "Home controller"
	)
	app = new Router()
	Backbone.history.start()
	return app
)

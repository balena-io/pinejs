define [
	'backbone'
	'models/sbvrmodel.coffee'
	'jquery'
	'views/main.coffee'
	'bootstrap'
], (Backbone, SBVRModel, $, MainView) ->

	$.ajaxSetup({
		xhrFields: {
			withCredentials: true
		}
	})

	Router = Backbone.Router.extend(
		routes:
			''       :  'main'
			':slug'  :  'loadModel'

		main: ->
			el = $('<div />')
			$('body').empty().append(el)

			mainView = new MainView(
				el: el
				model: new SBVRModel()
			)
			mainView.render()

		loadModel: (slug) ->
			# Create an empty model
			newModel = new SBVRModel()

			# Load the model identified by slug and
			# set its contents to newModel
			new SBVRModel({id: slug}).fetch(
				success: (model) ->
					newModel.set('content', model.get('content'))
			)

			# Render with newModel
			el = $('<div />')
			$('body').empty().append(el)
			new MainView(
				el: el
				model: newModel
			).render()
	)

	app = new Router()
	Backbone.history.start()
	return app

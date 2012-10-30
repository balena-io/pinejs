define([
	'backbone'
	'cs!./lfviz'
	'css!./style'
], (Backbone, lfviz) ->
	Backbone.View.extend(
		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Logical Formulation')

			@model.on('change:content', =>
				try
					lfviz(@model.compile(), @el)
				catch e
					console.log(e)
			)
	)
)

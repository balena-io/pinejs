define(['cs!sandbox', 'cs!./lfviz', 'css!./style'], (sandbox, lfviz) ->
	return {
		init: ->
			content = sandbox.createTab('Logical Formulation')
			sandbox.on('modelchange', (model) ->
				lfviz(model.compile(), content)
			)
	}
)

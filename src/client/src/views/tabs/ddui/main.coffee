define([
	'backbone'
	'ometa!./ClientURIParser'
	'cs!./drawDataUI'
	'jquery-ui'
	'cs!views/tabs/sbvr-server/main'
	'css!./jquery-ui'
], (Backbone, ClientURIParser, drawDataUI) ->
	Backbone.View.extend(
		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Data Editor')

			window.dduiState = (state) =>
				drawDataUI(ClientURIParser.matchAll(state, "expr")[1], (err, html) =>
					if err
						console.error(err)
					else
						@$el.html("""<div id="dataTab" aria-labelledby="ui-id-9" class="ui-tabs-panel ui-widget-content ui-corner-bottom" role="tabpanel" style="display: block;" aria-expanded="true" aria-hidden="false">""" + html + "</div>")
				)
			
			@model.on('onAir', =>
				drawDataUI(ClientURIParser.matchAll("#!/data", "expr")[1], (err, html) =>
					if err
						console.error(err)
					else
						@$el.html("""<div id="dataTab" aria-labelledby="ui-id-9" class="ui-tabs-panel ui-widget-content ui-corner-bottom" role="tabpanel" style="display: block;" aria-expanded="true" aria-hidden="false">""" + html + "</div>")
				)
			)
	)
)

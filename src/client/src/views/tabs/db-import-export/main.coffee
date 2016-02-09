define [
	'backbone'
	'lodash'
	'server-request'
	'jquery'
	'codemirror'
	'codemirror/addon/hint/sql-hint'
], (Backbone, _, serverRequest, $, CodeMirror) ->
	Backbone.View.extend(
		initialize: (@options) ->

		events:
			"click #bidb": "importDB"
			"click #bedb": "exportDB"

		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			@setTitle('Import/Export DB')

			html = """
				<div id="bidb" class="btn btn-small btn-primary">Import DB</div>
				<div id="bedb" class="btn btn-small">Export DB</div>
				<div id="importexportmessage" class="alert" style="display:none"></div>"""

			textarea = $('<textarea />')
			@$el.html(html).append(textarea)

			@editor = CodeMirror.fromTextArea(textarea.get(0),
				mode: 'text/x-sql'
				lineWrapping: true
			)

			@editor.addKeyMap(
				'Ctrl-Space': _.bind(@editor.showHint, @editor)
			)

			$(window).resize(=>
				@editor.setSize(@$el.width(), @$el.height() - 26)
			).resize()

		importDB: ->
			messageBox = $('#importexportmessage')
			messageBox.show()
			messageBox.toggleClass('alert-error alert-success', false)
			messageBox.toggleClass('alert-info', true)
			messageBox.text('Loading...')
			serverRequest('PUT', '/importdb/', {}, @editor.getValue())
			.then ->
				messageBox.toggleClass('alert-error alert-info', false)
				messageBox.toggleClass('alert-success', true)
				messageBox.text('Successfully imported db')
			.catch (err) ->
				messageBox.toggleClass('alert-success alert-info', false)
				messageBox.toggleClass('alert-error', true)
				messageBox.text('Failed to import db')
		exportDB: ->
			serverRequest('GET', '/exportdb/')
			.done ([statusCode, result]) =>
				@editor.setValue(result)
	)

define([
	'backbone'
	'jquery'
	'underscore'
	'codemirror'
	'codemirror-ometa-bridge/hinter'
	'codemirror-ometa-bridge/sbvr'
	'codemirror-simple-hint'
], (Backbone, $, _, CodeMirror, ometaAutoComplete) ->
	Backbone.View.extend(
		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Edit')

			textarea = $('<textarea />')
			@$el.empty().append(textarea)
			
			cancelUpdate = false

			updateModel = _.debounce(=>
				cancelUpdate = true
				@model.set('content', sbvrEditor.getValue())
			, 500)

			sbvrEditor = CodeMirror.fromTextArea(textarea.get(0),
				mode:
					name: 'sbvr'
					getOMetaEditor: -> sbvrEditor
				onKeyEvent: =>
					updateModel()
					ometaAutoComplete.apply(this, arguments)
				lineWrapping: true
			)
			
			@model.on('change:content', =>
				sbvrEditor.setValue(@model.get('content')) if not cancelUpdate
			)

			$(window).resize(=>
				sbvrEditor.setSize(@$el.width(), @$el.height())
			).resize()

			sbvrEditor.focus()
	)
)

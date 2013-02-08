define([
	'backbone'
	'jquery'
	'underscore'
	'codemirror'
	'codemirror-ometa-bridge/hinter'
	'codemirror-ometa-bridge/sbvr'
], (Backbone, $, _, CodeMirror, ometaAutoComplete) ->
	Backbone.View.extend(
		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Edit')

			textarea = $('<textarea />')
			@$el.empty().append(textarea)
			
			changeHandler = =>
				sbvrEditor.setValue(@model.get('content'))

			updateModel = _.debounce(=>
				@model.off('change:content', changeHandler)
				@model.set('content', sbvrEditor.getValue())
				@model.on('change:content', changeHandler)
			, 500)

			@model.on('change:content', changeHandler)

			autoCompleteKeyBinding = ometaAutoComplete()
			sbvrEditor = CodeMirror.fromTextArea(textarea.get(0),
				mode:
					name: 'sbvr'
					getOMetaEditor: -> sbvrEditor
				onKeyEvent: =>
					updateModel()
					autoCompleteKeyBinding.apply(this, arguments)
				lineWrapping: true
				highlightMargin: 0
			)

			$(window).resize(=>
				sbvrEditor.setSize(@$el.width(), @$el.height())
			).resize()

			sbvrEditor.focus()
	)
)

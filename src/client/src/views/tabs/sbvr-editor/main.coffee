define [
	'backbone'
	'jquery'
	'lodash'
	'codemirror'
	'codemirror-ometa/hinter'
	'ometa-highlighting/sbvr'
], (Backbone, $, _, CodeMirror, ometaAutoComplete) ->
	Backbone.View.extend(
		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			@setTitle('Edit')

			textarea = $('<textarea />')
			@$el.empty().append(textarea)

			changeHandler = =>
				sbvrEditor.setValue(@model.get('content'))

			updateModel = _.debounce(=>
				@model.off('change:content', changeHandler)
				@model.set('content', sbvrEditor.getValue())
				@model.on('change:content', changeHandler)
			, 100)

			@model.on('change:content', changeHandler)

			autoCompleteKeyBinding = ometaAutoComplete()
			sbvrEditor = CodeMirror.fromTextArea(textarea.get(0),
				mode:
					name: 'sbvr'
					getOMetaEditor: -> sbvrEditor
				lineWrapping: true
			)
			sbvrEditor.on('change', updateModel)
			sbvrEditor.addKeyMap(
				'Ctrl-Space': autoCompleteKeyBinding
			)
			@model.compile = ->
				# We return a clone of the LF to safeguard against naughty modifications.
				_.cloneDeep(sbvrEditor.getMode().fullParse())

			$(window).resize(=>
				sbvrEditor.setSize(@$el.width(), @$el.height())
			).resize()

			sbvrEditor.focus()
	)

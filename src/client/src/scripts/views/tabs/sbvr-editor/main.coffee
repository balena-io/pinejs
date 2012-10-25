define([
	'cs!sandbox'
	'jquery'
	'codemirror'
	'codemirror-ometa-bridge/hinter'
	'ometa!./prettify'
	'codemirror-ometa-bridge/sbvr'
	'codemirror-simple-hint'
], (sandbox, $, CodeMirror, ometaAutoComplete) ->
	return {
		init: ->
			textarea = $('<textarea/>')

			content = sandbox.createTab('Edit')
			content.append(textarea)

			sbvrEditor = CodeMirror.fromTextArea(textarea.get(0),
				mode:
					name: 'sbvr'
					getOMetaEditor: () -> sbvrEditor
				onKeyEvent: ometaAutoComplete
				lineWrapping: true
			)

			sandbox.on('modelchange', (model) ->
				sbvrEditor.setValue(model.get('content'))
				sbvrEditor.refresh()
			)
			
			sandbox.on('resize', ->
				sbvrEditor.setSize(content.width(), content.height())
			)
			sbvrEditor.setSize(content.width(), content.height())

			sbvrEditor.focus()
	}
)

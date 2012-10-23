define(['cs!glue', 'text!./editor.html', 'jquery', 'codemirror', 'ometa!./prettify', 'codemirror-ometa-bridge/hinter', 'codemirror-ometa-bridge/sbvr', 'codemirror-simple-hint'],
	(glue, html, $, CodeMirror, prettify, ometaAutoComplete) ->
		return {
			init: ->
				content = glue('Edit')
				content.html(html)
			
				sbvrEditor = CodeMirror.fromTextArea($('#editor')[0],
					mode:
						name: 'sbvr'
						getOMetaEditor: () -> sbvrEditor
					onKeyEvent: ometaAutoComplete
					lineWrapping: true
				)

				$(window).resize(->
					editor = $('.CodeMirror')
					editor.css(
						height: $(window).height() - editor.offset().top
					)
				)
				$(window).resize()
			
		}
)

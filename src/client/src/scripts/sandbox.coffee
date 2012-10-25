define([
	'jquery'
	'underscore'
	'backbone'
	'bootstrap'
], ($, _, Backbone) ->
	tabNum = 0

	$('#tabs').on('click', 'a', (e) ->
		e.preventDefault()
		$(this).tab('show')
	)

	sandbox =
		createTab: (title) ->
			id = 'tab' + tabNum++
			content = $("""<div id="#{id}"></div>""")

			tabElement = $("""<li><a href="##{id}">#{title}</a></li>""")
			$('#tabs').append(tabElement)
			$('#content').append(content)
			if tabNum is 1
				$('a', tabElement).tab('show')
			return content

	_.extend(sandbox, Backbone.Events)

	$(window).resize(->
		sandbox.trigger('resize')
	)

	return sandbox
)

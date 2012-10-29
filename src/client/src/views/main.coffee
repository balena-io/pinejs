define([
	'backbone'
	'jquery'
	'text!templates/main.html'
	'cs!views/login'

	# Tab subviews
	'cs!views/tabs/sbvr-editor/main'
	'cs!views/tabs/sbvr-lf/main'
	'cs!views/tabs/sbvr-graph/main'
], (Backbone, $, html, LoginView, tabViews...) ->
	Backbone.View.extend(
		id: 'app-main'

		events:
			'click  #new-model-button'      :  'create'
			'click  #publish-model-button'  :  'publish'
			'click  #login-button'          :  'login'
			'click  #publishSuccess .close' :  'closeAlert'
			'click  #publishSuccess a'      :  'closeAlert'

		render: ->
			@$el.html(html)
			for TabView, i in tabViews
				content = $("<div id='tab#{i}' />")
				tab = $("<li><a data-toggle='tab' href='#tab#{i}'/></li>")
				
				# Add tab to interface
				$('#tabs').append(tab)
				$('#content').append(content)

				# Render the tab
				new TabView(
					el: content
					title: $('a', tab)
					model: @model
				).render()

				# Show first tab
				$('a', tab).tab('show') if i is 0
			return this

		create: ->
			@model.set(
				content: ''
				id: null
			)

		publish: ->
			@model.save(null,
				success: =>
					# Get the slug of the created model
					slug = @model.get('slug')
					
					# Change the url
					require('cs!app').navigate(slug)

					# Alert the successful creation
					@$('#publishSuccess a').attr('href', '#' + slug).text('sbvr.co/#/' + slug)
					@$('#publishSuccess').fadeIn()

					# Reset the id to start from the beginning
					@model.set('id', null)
			)

		login: ->
			loginView = new LoginView({el: @$('#modal')})
			loginView.render()
			loginView.on("login", ->
				$("#login-button")
			)

		closeAlert: ->
			@$('#publishSuccess').fadeOut()
	)
)

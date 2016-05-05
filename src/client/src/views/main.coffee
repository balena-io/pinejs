define [
	'backbone'
	'jquery'
	'templates/main.html'
	'models/session.coffee'
	'views/login.coffee'
], (Backbone, $, html, SessionModel, LoginView) ->
	Backbone.View.extend(
		id: 'app-main'

		events:
			'click  #new-model-button': 'create'
			'click  #publish-model-button': 'publish'
			'click  #login-button': 'login'
			'click  #logout-button': 'logout'
			'click  #publishSuccess .close': 'closeAlert'
			'click  #publishSuccess a': 'closeAlert'

		render: ->
			@$el.html(html)
			$userGroup = @$('#user-group').hide(0)
			sid = localStorage.getItem('sid')
			if sid?
				session = new SessionModel({
					key: localStorage.getItem('sid')
				}).fetch().done(
					(data) =>
						@$('#login-group').hide(0)
						@$('#user-email').text(data.email)
						$userGroup.show(0)
					(error) ->
						localStorage.removeItem('sid')
						console.error(error)
				)

			# Tab subviews
			tabs = []
			if TAB_SBVR_EDITOR
				tabs.push require 'views/tabs/sbvr-editor/main.coffee'
			if TAB_SBVR_LF
				tabs.push require 'views/tabs/sbvr-lf/main.coffee'
			if TAB_SBVR_GRAPH
				tabs.push require 'views/tabs/sbvr-graph/main.coffee'
			if TAB_SBVR_SERVER
				tabs.push require 'views/tabs/sbvr-server/main.coffee'
			if TAB_DDUI
				tabs.push require 'views/tabs/ddui/main.coffee'
			if TAB_DB_IMPORT_EXPORT
				tabs.push require 'views/tabs/db-import-export/main.coffee'
			if TAB_VALIDATE
				tabs.push require 'views/tabs/validate/main.coffee'
			for TabView, i in tabs
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
					require('../app.coffee').navigate(slug)

					# Alert the successful creation
					@$('#publishSuccess a').attr('href', '#' + slug).text('sbvr.co/#/' + slug)
					@$('#publishSuccess').fadeIn()

					# Reset the id to start from the beginning
					@model.set('id', null)
				error: (model, jqXHR) =>
					if jqXHR.status is 401
						@login()
			)

		login: ->
			@$('#modal').remove()
			el = $('<div id="modal"/>')
			@$el.append(el)
			loginView = new LoginView({ el })
			loginView.render()
			loginView.on 'login', (email) =>
				@$('#login-group').hide(0)
				@$('#user-group').show(0)
				@$('#user-email').text(email)

		logout: ->
			session = new SessionModel({
				key: localStorage.getItem('sid')
			}).destroy().fail((error) ->
				console.error(error)
			).always(=>
				@$('#user-group').hide(0)
				@$('#login-group').show(0)
				localStorage.removeItem('sid')
			)

		closeAlert: ->
			@$('#publishSuccess').fadeOut()
	)

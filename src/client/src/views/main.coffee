define([
	'backbone'
	'jquery'
	'text!templates/main.html'
	"cs!models/session"
	'cs!views/login'

	# Tab subviews
	'cs!views/tabs/sbvr-editor/main'
	'cs!views/tabs/sbvr-lf/main'
	'cs!views/tabs/sbvr-graph/main'
], (Backbone, $, html, SessionModel, LoginView, tabViews...) ->
	Backbone.View.extend(
		id: 'app-main'

		events:
			'click  #new-model-button'      :  'create'
			'click  #publish-model-button'  :  'publish'
			'click  #login-button'          :  'login'
			'click  #logout-button'         :  'logout'
			'click  #publishSuccess .close' :  'closeAlert'
			'click  #publishSuccess a'      :  'closeAlert'

		render: ->
			@$el.html(html)
			$userGroup = @$("#user-group").hide(0)
			sid = sessionStorage.getItem("sid")
			if sid?
				session = new SessionModel({
					key: sessionStorage.getItem("sid")
				}).fetch().done((data) =>
					@$("#login-group").hide(0)
					@$("#user-email").text(data.email)
					$userGroup.show(0)
				).fail((error) ->
					sessionStorage.removeItem("sid")
					console.error(error)
				)


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

		login: (e) ->
			e.preventDefault()
			this.$('#modal').remove()
			el = $('<div id="modal"/>')
			@$el.append(el)
			loginView = new LoginView({el})
			loginView.render()
			loginView.on("login", (email) =>
				@$("#login-group").hide(0)
				@$("#user-group").show(0)
				@$("#user-email").text(email)
			)

		logout: (e) ->
			e.preventDefault()
			session = new SessionModel({
				key: sessionStorage.getItem("sid")
			}).destroy().fail((error) ->
				console.error(error)
			).always(=>
				@$("#user-group").hide(0)
				@$("#login-group").show(0)
				sessionStorage.removeItem("sid")
			)

		closeAlert: ->
			@$('#publishSuccess').fadeOut()
	)
)

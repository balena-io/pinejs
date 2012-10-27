define([
	'backbone'
	'text!templates/login.html'
], (Backbone, html) ->
	Backbone.View.extend(
		id: 'app-main'

		events:
			'click  button.login'     :  'login'
			'click  button.register'  :  'register'

		render: ->
			@$el.html(html)
			this.$('#loginModal').modal('show')
			return this

		login: ->
			console.log('LoginView: login')

		register: ->
			console.log('LoginView: register')
	)
)

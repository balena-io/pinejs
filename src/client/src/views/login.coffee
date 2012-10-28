define([
	"backbone"
	"cs!../models/session"
	"cs!../models/user"
	"text!templates/login.html"
], (Backbone, SessionModel, UserModel, html) ->
	Backbone.View.extend(
		id: 'app-main'

		events:
			'click button.login': 'login'
			'click button.register': 'register'

		render: ->
			@$el.html(html)
			this.$('#loginModal').modal('show')
			return this

		login: (e) ->
			e.preventDefault()
			$form = ("#loginModal")
			session = new SessionModel({
				email: $("#inputEmail", $form).val()
				password: $("#inputPassword", $form).val()
			}).save().done((data)->
				sessionStorage.set("session", data.id)
			).fail((error) ->
				console.error(error)
			)

		register: (e) ->
			e.preventDefault()
			$form = ("#registerModal")
			user = new UserModel({
				email: $("#inputEmail", $form).val()
				password: $("#inputPassword", $form).val()
				password2: $("#inputPasswordConfirm", $form).val()
			}).save().done((data)->
			
			).fail((error) ->
				console.error(error)
			)
	)
)

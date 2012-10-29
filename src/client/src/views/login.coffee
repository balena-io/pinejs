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
			email = $("#inputEmail", $form).val()
			password = $("#inputPassword", $form).val()
			session = new SessionModel({
				email
				password
			}).save().done((data) =>
				sessionStorage.setItem("session", data.id)
				sessionStorage.setItem("email", email)
				this.$('#loginModal').modal("hide").on("hidden", =>
					this.trigger("login")
				)
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

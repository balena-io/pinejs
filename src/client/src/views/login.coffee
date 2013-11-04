define [
	'backbone'
	'cs!models/session'
	'cs!models/user'
	'text!templates/login.html'
	'text!templates/register.html'
], (Backbone, SessionModel, UserModel, loginHtml, registerHtml) ->
	Backbone.View.extend(
		id: 'app-main'

		events:
			'submit  #loginForm'      :  'login'
			'click   a.showRegister'  :  'showRegister'
			'submit  #registerForm'   :  'register'
			'click   a.showLogin'     :  'showLogin'

		render: ->
			@$el.html('<div class="modal hide fade" id="loginModal" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">')
			this.showLogin()
			@$('#loginModal').modal('show')
			return this

		login: ->
			email = @$('#inputEmail').val()
			password = @$('#inputPassword').val()
			session = new SessionModel({
				email
				password
			}).save().done((data) =>
				localStorage.setItem('sid', data.id)
				this.$('#loginModal').modal('hide').on('hidden', =>
					console.log this
					this.trigger('login', email)
				)
			).fail((error) ->
				console.error(error)
			)
			return false

		register: ->
			email = @$('#inputEmail').val()
			password = @$('#inputPassword').val()
			user = new UserModel(
				email: email
				password: password
			).save().done(=>
				@login()
			)
			return false

		showLogin: ->
			@$('#loginModal').html(loginHtml)

		showRegister: ->
			@$('#loginModal').html(registerHtml)
			$password = @$('#inputPassword')
			$passwordConfirm = @$('#inputPasswordConfirm')
			$passwordConfirm.keyup(->
				if $password.val() isnt $passwordConfirm.val()
					$passwordConfirm[0].setCustomValidity?("Passwords don't match")
				else
					$passwordConfirm[0].setCustomValidity?('')
			)
	)

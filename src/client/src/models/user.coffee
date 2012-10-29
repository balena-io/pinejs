define([
	'backbone'
], (Backbone) ->
	Backbone.Model.extend({
		urlRoot: 'http://localhost:5000/v1/users'
		validate: (attributes) ->
			if not attributes.email?
				return 'E-mail address must be specified'
			if not attributes.password?
				return 'Password must be specified'
			if attributes.password is attributes.password2
				return 'Password values do not match'
		idAttribute: 'email'
		toJson: -> {
			email: this.get('email')
			password: this.get('password')
		}
	})
)

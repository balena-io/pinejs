define([
	'config'
	'backbone'
], (config, Backbone) ->
	Backbone.Model.extend({
		urlRoot: config.apiServer + 'v1/users'
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

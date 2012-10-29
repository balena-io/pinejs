define([
	'cs!config'
	'backbone'
], (config, Backbone) ->
	Backbone.Model.extend({
		urlRoot: config.apiServer + 'v1/sessions'
		idAttribute: 'key'
		validate: (attributes) ->
			if not attributes.email?
				return 'E-mail address must be specified'
			if not attributes.password?
				return 'Password must be specified'
	})
)

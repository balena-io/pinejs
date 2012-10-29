define([
	"backbone"
], (Backbone) ->
	Backbone.Model.extend({
		urlRoot: "http://localhost:5000/v1/sessions"
		idAttribute: "key"
		validate: (attributes) ->
			if not attributes.email?
				return "E-mail address must be specified"
			if not attributes.password?
				return "Password must be specified"
	})
)

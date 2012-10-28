define(['backbone', 'ometa!sbvr-parser/SBVRParser'], (Backbone, SBVRParser) ->
	return Backbone.Model.extend({
		defaults:
			id: null
			content: ''
		compile: -> SBVRParser.matchAll(this.get('content'), 'Process')
		urlRoot: 'http://localhost:5000/v1/models'
	})
)

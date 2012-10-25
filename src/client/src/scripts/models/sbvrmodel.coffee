define(['backbone', 'ometa!sbvr-parser/SBVRParser'], (Backbone, SBVRParser) ->
	return Backbone.Model.extend({
		id: null
		content: ''
		compile: -> SBVRParser.matchAll(this.get('content'), 'Process')
		urlRoot: 'http://api.sbvr.co/v1/models'
	})
)

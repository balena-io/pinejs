define(['cs!config', 'backbone', 'ometa!sbvr-parser/SBVRParser'], (config, Backbone, SBVRParser) ->
	Backbone.Model.extend({
		defaults:
			id: null
			content: ''
		compile: -> SBVRParser.matchAll(this.get('content'), 'Process')
		urlRoot: config.apiServer + 'v1/models'
	})
)

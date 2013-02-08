define(['cs!config', 'backbone', 'ometa!sbvr-parser/SBVRParser'], (config, Backbone, SBVRParser) ->
	sbvrParser = SBVRParser.createInstance()
	sbvrParser.enableReusingMemoizations(sbvrParser._sideEffectingRules)
	Backbone.Model.extend({
		defaults:
			id: null
			content: ''
		compile: ->
			sbvrParser.reset()
			sbvrParser.matchAll(this.get('content'), 'Process')
		urlRoot: config.apiServer + 'v1/models'
	})
)

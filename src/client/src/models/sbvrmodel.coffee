define(['cs!config', 'backbone', 'cs!extended-sbvr-parser'], (config, Backbone, SBVRParser) ->
	Backbone.Model.extend({
		defaults:
			id: null
			content: ''
		compile: do ->
			sbvrParser = SBVRParser.createInstance()
			sbvrParser.enableReusingMemoizations(sbvrParser._sideEffectingRules)
			return ->
				sbvrParser.reset()
				return sbvrParser.matchAll(@get('content'), 'Process')
		urlRoot: config.apiServer + 'v1/models'
	})
)

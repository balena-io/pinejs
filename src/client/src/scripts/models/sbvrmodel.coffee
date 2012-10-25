define(['backbone', 'ometa!sbvr-parser/SBVRParser'], (Backbone, SBVRParser) ->
	return Backbone.Model.extend({
		id: ''
		content: ''
		compile: -> SBVRParser.matchAll(@content, 'Process')
		url: 'http://api.sbvr.co:5000/v1/models'
	})
)

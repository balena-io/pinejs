define(['backbone', 'ometa!sbvr-parser/SBVRParser'], (Backbone, SBVRParser) ->
	return Backbone.Model.extend({
		structuredEnglish: ''
		logicalFormulation: []
		compile: (source) ->
			@structuredEnglish = source
			@logicalFormulation = SBVRParser.matchAll(source, 'Process')
	})
)

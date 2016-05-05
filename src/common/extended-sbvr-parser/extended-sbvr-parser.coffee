{ SBVRParser } = require '@resin/sbvr-parser'
Types = require '@resin/sbvr-types/Type.sbvr'

module.exports = SBVRParser._extend
	initialize: ->
		SBVRParser.initialize.call(this)
		@AddCustomAttribute('Database ID Field:')
		@AddCustomAttribute('Database Table Name:')
		@AddBuiltInVocab(Types)
		return this

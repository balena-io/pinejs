{SBVRParser} = require 'sbvr-parser'
Types = require 'sbvr-types/Type.sbvr'

module.exports = SBVRParser._extend
	initialize: ->
		SBVRParser.initialize.call(@)
		if SBVR_EXTENSIONS
			@AddCustomAttribute('Database ID Field:')
			@AddCustomAttribute('Database Table Name:')
		@AddBuiltInVocab(Types)
		@

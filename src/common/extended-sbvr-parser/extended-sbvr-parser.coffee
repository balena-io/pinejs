define ['sbvr-parser', 'sbvr-types/Type.sbvr'], ({SBVRParser}, Types) ->
	return SBVRParser._extend
		initialize: ->
			SBVRParser.initialize.call(@)
			if SBVR_EXTENSIONS
				@AddCustomAttribute('Database ID Field:')
				@AddCustomAttribute('Database Table Name:')
			@AddBuiltInVocab(Types)
			@

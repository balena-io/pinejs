define ['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'TEXT'
			mysql: 'TEXT'
			websql: 'TEXT'
			odata:
				name: 'Edm.String'

		nativeProperties:
			'has':
				'Length': (from) -> ['CharacterLength', from]

		nativeFactTypes:
			'Text': TypeUtils.nativeFactTypeTemplates.equality

		validate: TypeUtils.validate.text()
	}

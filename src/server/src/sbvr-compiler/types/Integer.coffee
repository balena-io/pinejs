define ['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'INTEGER'
			mysql: 'INTEGER'
			websql: 'INTEGER'
			odata:
				name: 'Edm.Int64'

		nativeFactTypes:
			'Integer': TypeUtils.nativeFactTypeTemplates.comparison
			'Real': TypeUtils.nativeFactTypeTemplates.comparison

		validate: TypeUtils.validate.integer
	}

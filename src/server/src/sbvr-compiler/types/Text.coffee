define(['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'TEXT'
			mysql: 'TEXT'
			websql: 'TEXT'
			odata:
				name: 'Edm.String'

		validate: TypeUtils.validate.text()
	}
)
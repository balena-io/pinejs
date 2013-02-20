define(['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'VARCHAR(255)'
			mysql: 'VARCHAR(255)'
			websql: 'VARCHAR(255)'
			odata:
				name: 'Edm.String'

		validate: TypeUtils.validate.text(255)
	}
)
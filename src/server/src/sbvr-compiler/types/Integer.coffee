define(['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'INTEGER'
			mysql: 'INTEGER'
			websql: 'INTEGER'
			odata:
				name: 'Edm.Int64'

		validate: TypeUtils.validate.integer
	}
)
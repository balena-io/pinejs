define(['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'SERIAL'
			mysql: (necessity, index) ->
				return 'INTEGER' + necessity + index + ' AUTO_INCREMENT'
			websql: (necessity, index) ->
				return 'INTEGER' + necessity + index + ' AUTOINCREMENT'
			odata:
				name: 'Edm.Int64'

		validate: TypeUtils.validate.integer
	}
)
define(['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'TIME'
			mysql: 'TIME'
			websql: 'INTEGER'
			odata:
				name: 'Edm.DateTime'

		fetchProcessing: (data, callback) ->
			callback(null, new Date(data))

		validate: TypeUtils.validate.date
	}
)
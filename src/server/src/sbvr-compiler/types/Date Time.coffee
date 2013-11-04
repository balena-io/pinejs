define ['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'TIMESTAMP'
			mysql: 'TIMESTAMP'
			websql: 'INTEGER'
			odata:
				name: 'Edm.DateTime'

		fetchProcessing: (data, callback) ->
			callback(null, new Date(data))

		validate: TypeUtils.validate.date
	}

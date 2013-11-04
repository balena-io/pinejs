define ['lodash'], (_) ->
	return {
		types:
			postgres: 'TEXT'
			mysql: 'TEXT'
			websql: 'TEXT'
			odata:
				name: 'Edm.String' # TODO: What should this really be?

		fetchProcessing: (data, callback) ->
			try
				callback(null, JSON.parse(data))
			catch e
				callback(e)

		validate: (value, required, callback) ->
			try
				callback(null, JSON.stringify(value))
			catch e
				console.error(e)
				callback('cannot be turned into JSON: ' + originalValue)
	}

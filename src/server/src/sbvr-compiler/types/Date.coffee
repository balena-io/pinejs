define(['underscore'], (_) ->
	return {
		types:
			postgres: 'DATE'
			mysql: 'DATE'
			websql: 'INTEGER'
			odata:
				name: 'Edm.DateTime'

		fetchProcessing: (data, callback) ->
			callback(null, new Date(data))

		validate: (value, required, callback) ->
			processedValue = Number(value)
			if _.isNaN(processedValue)
				processedValue = originalValue
			processedValue = new Date(processedValue)
			if _.isNaN(processedValue.getTime())
				callback('is not a ' + field[0] + ': ' + originalValue)
			else	
				callback(null, processedValue)
	}
)
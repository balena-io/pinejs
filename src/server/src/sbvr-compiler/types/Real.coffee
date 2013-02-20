define(['underscore'], (_) ->
	return {
		types:
			postgres: 'REAL'
			mysql: 'REAL'
			websql: 'REAL'
			odata:
				name: 'Edm.Double'

		validate: (value, required, callback) ->
			processedValue = parseFloat(value)
			if _.isNaN(processedValue)
				callback('is not a number: ' + value)
			else
				callback(null, processedValue)
	}
)
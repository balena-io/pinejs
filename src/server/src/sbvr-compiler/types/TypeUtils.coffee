define(['underscore'], (_) ->
	return {
		validate:
			integer: (value, required, callback) ->
				processedValue = parseInt(value, 10)
				if _.isNaN(processedValue)
					callback('is not a number: ' + value)
				else
					callback(null, processedValue)
	}
)
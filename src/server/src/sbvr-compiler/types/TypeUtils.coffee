define(['underscore'], (_) ->
	return {
		validate:
			integer: (value, required, callback) ->
				value = parseInt(value, 10)
				if _.isNaN(value)
					callback('is not a number: ' + originalValue)
				else
					callback(null, value)
	}
)
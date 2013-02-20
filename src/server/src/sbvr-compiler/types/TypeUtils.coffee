define(['underscore'], (_) ->
	return {
		validate:
			integer: (value, required, callback) ->
				processedValue = parseInt(value, 10)
				if _.isNaN(processedValue)
					callback('is not a number: ' + value)
				else
					callback(null, processedValue)
			text: (length) ->
				(value, required, callback) ->
					if !_.isString(value)
						callback('is not a string: ' + value)
					else if length? and value.length > length
						callback('longer than 255 characters (' + value.length + ')')
					else
						callback(null, value)
	}
)
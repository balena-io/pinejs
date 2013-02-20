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
			date: (value, required, callback) ->
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
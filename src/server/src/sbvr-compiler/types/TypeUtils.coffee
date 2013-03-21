define(['lodash'], (_) ->
	equality = (from, to) -> ['Equals', from, to]
	return {
		nativeFactTypeTemplates:
			equality:
				'is equal to':				equality
				'equals':					equality
			comparison:
				'is greater than':			(from, to) -> ['GreaterThan', from, to]
				'is greater than or equal to':	(from, to) -> ['GreaterThanOrEqual', from, to]
				'is less than':				(from, to) -> ['LessThan', from, to]
				'is less than or equal to':		(from, to) -> ['LessThanOrEqual', from, to]
				'is equal to':				equality
				'equals':					equality

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
					callback('is not a valid date: ' + originalValue)
				else	
					callback(null, processedValue)
	}
)
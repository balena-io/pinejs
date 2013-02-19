define(['underscore'], (_) ->
	return {
		types:
			postgres: 'TEXT'
			mysql: 'TEXT'
			websql: 'TEXT'
			odata:
				name: 'Edm.String'

		validate: (value, required, callback) ->
			if !_.isString(value)
				callback('is not a string: ' + value)
			else
				callback(null, value)
	}
)
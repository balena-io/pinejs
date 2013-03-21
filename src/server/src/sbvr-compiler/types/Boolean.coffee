define(['lodash'], (_) ->
	return {
		types:
			postgres: 'INTEGER DEFAULT 0'
			mysql: 'INTEGER DEFAULT 0'
			websql: 'INTEGER DEFAULT 0'
			odata:
				name: 'Edm.Boolean'

		fetchProcessing: (data, callback) ->
			callback(null, data == 1)

		validate: (value, required, callback) ->
			# We use Number rather than parseInt as it deals with booleans and will return NaN for things like "a1"
			value = Number(value)
			if _.isNaN(value) or value not in [0, 1]
				callback('is not a boolean: ' + originalValue)
			else
				callback(null, value)
	}
)
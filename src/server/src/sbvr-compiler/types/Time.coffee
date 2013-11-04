define ['cs!sbvr-compiler/types/TypeUtils'], (TypeUtils) ->
	return {
		types:
			postgres: 'TIME'
			mysql: 'TIME'
			websql: 'TEXT'
			odata:
				name: 'Edm.DateTime'

		fetchProcessing: (data, callback) ->
			# We append the date of the epoch so that we can parse this as a valid date.
			callback(null, new Date('Thu, 01 Jan 1970 ' + data))

		validate: (value, required, callback) ->
			TypeUtils.validate.date value, required, (err, value) ->
				if err
					callback(err)
					return
				callback(null, value.toLocaleTimeString())
	}

define ['lodash', 'cs!sbvr-compiler/types/TypeUtils'], (_, TypeUtils) ->
	return {
		types:
			postgres: 'REAL'
			mysql: 'REAL'
			websql: 'REAL'
			odata:
				name: 'Edm.Double'

		nativeFactTypes:
			'Integer': TypeUtils.nativeFactTypeTemplates.comparison
			'Real': TypeUtils.nativeFactTypeTemplates.comparison

		validate: (value, required, callback) ->
			processedValue = parseFloat(value)
			if _.isNaN(processedValue)
				callback('is not a number: ' + value)
			else
				callback(null, processedValue)
	}

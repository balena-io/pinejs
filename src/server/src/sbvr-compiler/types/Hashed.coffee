define(['underscore'], (_) ->
	return {
		types:
			postgres: 'CHAR(60)'
			mysql: 'CHAR(60)'
			websql: 'CHAR(60)'
			odata:
				name: 'Edm.String'

		validate: (value, required, callback) ->
			if !_.isString(value)
				callback('is not a string')
			else if window? && window == (()->this)()
				# Warning: If we're running in the browser then store unencrypted (no bcrypt module available)
				if value.length > 60
					callback('longer than 60 characters (' + value.length + ')')
			else
				bcrypt = require('bcrypt')
				bcrypt.genSalt((err, salt) ->
					if err
						callback(err)
					else
						bcrypt.hash(value, salt, callback)
				)
	}
)
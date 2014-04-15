define ->
	class CustomError extends Error
		constructor: (message) ->
			if message instanceof Error
				err = message
			else
				err = new Error(message)
			err.name = @constructor.name
			@name = err.name
			@message = err.message
			if Error.captureStackTrace?
				Error.captureStackTrace(@, @constructor)
			else if err.stack?
				@stack = err.stack

	return CustomError

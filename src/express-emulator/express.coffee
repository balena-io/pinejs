define ['bluebird', 'lodash'], (Promise, _) ->
	window?.GLOBAL_PERMISSIONS = [
		'resource.all'
	]
	app = do ->
		enabled = {}
		enabled.promise = new Promise (resolve) ->
			enabled.resolve = resolve
		appVars =
			env: 'development'
		handlers =
			# USE is a list of middleware to run before any request.
			USE: []
			POST: []
			PUT: []
			DELETE: []
			GET: []
			PATCH: []
			MERGE: []
			OPTIONS: []
		addHandler = (handlerName, match, middleware...) ->
			#Strip wildcard
			match = match.toLowerCase()
			newMatch = match.replace(/[\/\*]*$/, '')
			if newMatch != match
				match = newMatch
				paramName = '*'
			else
				paramMatch = /:(.*)$/.exec(match)
				paramName = if !paramMatch? then null else paramMatch[1]
			handlers[handlerName].push(
				match: match
				paramName: paramName
				# Flatten middleware list to handle arrays of middleware in the arg list.
				middleware: _.flattenDeep(middleware)
			)
		process = (method, uri, headers, body) ->
			body ?= ''
			if !handlers[method]
				return Promise.rejected(404)
			req =
				# Have a default user for in-browser with all permissions
				user:
					permissions: window.GLOBAL_PERMISSIONS
				method: method
				body: body
				headers: headers
				url: uri
				params: {}
				query: {}
				login: (user, callback) -> callback()
			console.log(method, uri, body)
			if uri[-1..] == '/'
				uri = uri[0...uri.length - 1]
			uri = uri.toLowerCase()
			new Promise (resolve, reject) ->
				res =
					statusCode: 200
					status: (@statusCode) ->
						return this
					json: (obj) ->
						# Stringify and parse to emulate passing over network.
						obj = JSON.parse(JSON.stringify(obj))
						if @statusCode >= 400
							reject([@statusCode, obj, null])
						else
							resolve([@statusCode, obj, null])
					send: (data) ->
						data = _.cloneDeep(data)
						if @statusCode >= 400
							reject([@statusCode, data, null])
						else
							resolve([@statusCode, data, null])
					sendStatus: (statusCode) ->
						statusCode ?= @statusCode
						if statusCode >= 400
							reject([statusCode, null, null])
						else
							resolve([statusCode, null, null])
					redirect: ->
						reject([307])
					set: ->
					type: ->

				methodHandlers = handlers.USE.concat(handlers[method])
				i = -1
				j = -1

				next = (route) ->
					j++
					if route == 'route' or j >= methodHandlers[i].middleware.length
						checkMethodHandlers()
					else
						methodHandlers[i].middleware[j](req, res, next)
				checkMethodHandlers = ->
					i++
					if i < methodHandlers.length
						if uri[0...methodHandlers[i].match.length] == methodHandlers[i].match
							j = -1
							# Reset params that may have been added on previous routes that failed in middleware
							req.params = {}
							if methodHandlers[i].paramName?
								req.params[methodHandlers[i].paramName] = uri[methodHandlers[i].match.length..]
								next()
							else if uri.length != methodHandlers[i].match.length
								# Not an exact match and no parameter matching
								checkMethodHandlers()
							else
								next()
						else
							checkMethodHandlers()
					else
						res.sendStatus(404)
				checkMethodHandlers()
		return {
			use: _.partial(addHandler, 'USE', '/*')
			get: (name) ->
				callback = arguments[arguments.length - 1]
				if _.isFunction(callback)
					addHandler('GET', arguments...)
				else
					return appVars[name]
			post: _.partial(addHandler, 'POST')
			put: _.partial(addHandler, 'PUT')
			delete: _.partial(addHandler, 'DELETE')
			patch: _.partial(addHandler, 'PATCH')
			merge: _.partial(addHandler, 'MERGE')
			options: _.partial(addHandler, 'OPTIONS')
			all: (args...) ->
				@post(args...)
				@get(args...)
				@put(args...)
				@delete(args...)
			process: (args...) ->
				# The promise will run the real process function asynchronously once the app is enabled,
				# which matches somewhat more closely to an AJAX call than doing it synchronously.
				enabled.promise.then ->
					process(args...)
			listen: ->
				callback = arguments[arguments.length - 1]
				enabled.resolve()
				if _.isFunction(callback)
					enabled.promise.then(callback)
			set: (name, value) ->
				appVars[name] = value
		}

	express = ->
		return app

	return express

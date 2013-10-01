define ['q', 'lodash'], (Q, _) ->
	window?.GLOBAL_PERMISSIONS = 
		'resource.all': true
	app = do ->
		enabled = Q.defer()
		handlers =
			POST: []
			PUT: []
			DELETE: []
			GET: []
			PATCH: []
			MERGE: []
		addHandler = (handlerName, match, middleware...) ->
			#Strip wildcard
			match = match.replace(/[\/\*]*$/,'').toLowerCase()
			paramMatch = /:(.*)$/.exec(match)
			paramName = (paramMatch == null ? null : paramMatch[1] )
			handlers[handlerName].push(
				match: match
				paramName: paramName
				middleware: middleware
			)
		process = (method, uri, headers, body = '') ->
			if !handlers[method]
				return Q.reject(404)
			deferred = Q.defer()
			req =
				# Have a default user for in-browser with all permissions
				user:
					permissions: window.GLOBAL_PERMISSIONS
				method: method
				body: body
				headers: headers
				url: uri
				params: {}
				login: (user, callback) -> callback()
			console.log(method, uri, body)
			if uri[-1..] == '/'
				uri = uri[0...uri.length - 1]
			uri = uri.toLowerCase()
			res =
				json: (obj, headers = 200, statusCode) ->
					if typeof headers == 'number' and !statusCode?
						[statusCode, headers] = [headers, {}]
					# Stringify and parse to emulate passing over network.
					obj = JSON.parse(JSON.stringify(obj))
					if statusCode >= 400
						deferred.reject([statusCode, obj, headers])
					else
						deferred.resolve([statusCode, obj, headers])
				send: (statusCode, headers) ->
					if statusCode >= 400
						deferred.reject([statusCode, null, headers])
					else
						deferred.resolve([statusCode, null, headers])
				redirect: ->
					deferred.reject([307])
				set: ->
				type: ->
			next = (route) ->
				j++
				if route == 'route' or j >= methodHandlers[i].middleware.length
					checkMethodHandlers()
				else
					methodHandlers[i].middleware[j](req, res, next)
			
			methodHandlers = handlers[method]
			i = -1
			j = -1
			checkMethodHandlers = ->
				i++
				if i < methodHandlers.length
					if uri[0...methodHandlers[i].match.length] == methodHandlers[i].match
						j = -1
						if methodHandlers[i].paramName != null
							req.params[methodHandlers[i].paramName] = uri[methodHandlers[i].match.length..]
						next()
					else
						checkMethodHandlers()
				else
					res.send(404)
			checkMethodHandlers()
			return deferred.promise
		return {
			get: _.partial(addHandler,'GET')
			post: _.partial(addHandler,'POST')
			put: _.partial(addHandler,'PUT')
			del: _.partial(addHandler,'DELETE')
			patch: _.partial(addHandler,'PATCH')
			merge: _.partial(addHandler,'MERGE')
			all: (args...) ->
				@post(args...)
				@get(args...)
				@put(args...)
				@del(args...)
			process: (args...) ->
				# The promise will run the real process function asynchronously once the app is enabled,
				# which matches somewhat more closely to an AJAX call than doing it synchronously.
				enabled.promise.then ->
					process(args...)
			enable: ->
				enabled.resolve()
			configure: ->
		}

	return {
		app: app
	}

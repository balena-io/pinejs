define((requirejs, exports, module) ->
	window?.GLOBAL_PERMISSIONS = 
		'resource.all': true
	app = do() ->
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
		process = (method, uri, headers, body = '', successCallback, failureCallback) ->
			if !handlers[method]
				failureCallback(404)
			req =
				# Have a default user for in-browser with all permissions
				user:
					permissions: window.GLOBAL_PERMISSIONS
				method: method
				body: body
				headers: headers
				url: uri
				params: {}
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
						failureCallback(statusCode, obj, headers)
					else
						successCallback(statusCode, obj, headers)
				send: (statusCode, headers) ->
					if statusCode >= 400
						failureCallback(statusCode, null, headers)
					else
						successCallback(statusCode, null, headers)
				redirect: ->
					failureCallback(307)
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
			checkMethodHandlers = () ->
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
		queuedRequests = []
		return {
			post: (args...) -> addHandler.apply(null, ['POST'].concat(args))
			get: (args...) -> addHandler.apply(null, ['GET'].concat(args))
			put: (args...) -> addHandler.apply(null, ['PUT'].concat(args))
			del: (args...) -> addHandler.apply(null, ['DELETE'].concat(args))
			patch: (args...) -> addHandler.apply(null, ['PATCH'].concat(args))
			merge: (args...) -> addHandler.apply(null, ['MERGE'].concat(args))
			all: () ->
				@post.apply(this, arguments)
				@get.apply(this, arguments)
				@put.apply(this, arguments)
				@del.apply(this, arguments)
			process: (args...) ->
				queuedRequests.push(args)
			enable: ->
				@process = (args...) ->
					# Run the real process function asynchronously, to match somewhat more closely to an AJAX call.
					setTimeout(
						-> process.apply(null, args)
						0
					)
				for queuedRequest in queuedRequests
					@process.apply(@, queuedRequest)
			configure: ->
		}

	return {
		app: app
	}
)
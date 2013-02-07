define((requirejs, exports, module) ->
	window?.GLOBAL_PERMISSIONS = 
		'resource.all': true
	app = do() ->
		handlers =
			POST: []
			PUT: []
			DELETE: []
			GET: []
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
		return {
			post: (args...) -> addHandler.apply(null, ['POST'].concat(args))
			get: (args...) -> addHandler.apply(null, ['GET'].concat(args))
			put: (args...) -> addHandler.apply(null, ['PUT'].concat(args))
			del: (args...) -> addHandler.apply(null, ['DELETE'].concat(args))
			all: () ->
				this.post.apply(this, arguments)
				this.get.apply(this, arguments)
				this.put.apply(this, arguments)
				this.del.apply(this, arguments)
			process: (method, uri, headers, body = '', successCallback, failureCallback) ->
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
						if statusCode == 404
							failureCallback(statusCode, obj, headers)
						else
							successCallback(statusCode, obj, headers)
					send: (statusCode, headers) ->
						if statusCode == 404
							failureCallback(statusCode, null, headers)
						else
							successCallback(statusCode, null, headers)
					redirect: ->
						failureCallback(307)
					set: ->
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
		}

	return {
		app: app
	}
)
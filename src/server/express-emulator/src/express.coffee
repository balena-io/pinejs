define((requirejs, exports, module) ->
	app = do() ->
		handlers =
			POST: []
			PUT: []
			DELETE: []
			GET: []
		addHandler = (handlerName, match, middleware...) ->
			#Strip wildcard
			match = match.replace(/[\/\*]*$/,'')
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
			process: (method, uri, headers, body, successCallback, failureCallback) ->
				if uri[-1..] == '/'
					uri = uri[0...uri.length - 1]
				uri = uri.toLowerCase()
				console.log(uri)
				if !handlers[method]
					failureCallback(404)
				req =
					body: body
					headers: headers
					url: uri
					params: {}
				res =
					json: (obj, headers = 200, statusCode) ->
						if typeof headers == 'number' and !statusCode?
							[statusCode, headers] = [headers, {}]
						if statusCode == 404
							failureCallback(statusCode, obj, headers)
						else
							successCallback(statusCode, obj, headers)
					send: (statusCode) ->
						if statusCode == 404
							failureCallback(statusCode)
						else
							successCallback(statusCode)
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
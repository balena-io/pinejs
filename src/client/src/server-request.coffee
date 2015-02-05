define [
	'has'
	'bluebird'
	'jquery'
], (has, Promise, $) ->
	return (method, uri, headers = {}, body, successCallback, failureCallback) ->
		deferred = Promise.pending()
		if !headers["Content-Type"]? and body?
			headers["Content-Type"] = "application/json"
		$("#httpTable").append('<tr class="server_row"><td><strong>' + method + '</strong></td><td>' + uri + '</td><td>' + (if headers.length == 0 then '' else JSON.stringify(headers)) + '</td><td>' + JSON.stringify(body) + '</td></tr>')
		if has 'ENV_BROWSER'
			require ['cs!server-glue/server'], (Server) ->
				deferred.fulfill(Server.app.process(method, uri, headers, body))
		else
			if body?
				body = JSON.stringify(body)
			$.ajax uri,
				headers: headers
				data: body
				error: (jqXHR, textStatus, errorThrown) ->
					try
						error = JSON.parse(jqXHR.responseText)
					catch e
						error = jqXHR.responseText
					deferred.reject([jqXHR.status, error])

				success: (data, textStatus, jqXHR) ->
					rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg
					responseHeaders = {}
					responseHeadersString = jqXHR.getAllResponseHeaders()
					while match = rheaders.exec( responseHeadersString )
						responseHeaders[ match[1].toLowerCase() ] = match[2]
					deferred.fulfill([jqXHR.status, data, responseHeaders])

				type: method
		if successCallback?
			deferred.promise.then((args) -> successCallback(args...))
		if failureCallback?
			deferred.promise.catch((args) -> failureCallback(args...))
		return deferred.promise

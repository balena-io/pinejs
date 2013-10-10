define([
	'backbone'
	'has'
	'bluebird'
], (Backbone, has, Q) ->
	Backbone.View.extend(
		events:
			"click #run-server": "runServer"

		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Server')
			
			html = """
				<button id="run-server">Run Server</button>
				<table class='textTable table table-striped'>
					<thead>
						<tr>
							<th><strong>Method</strong></th>
							<th><strong>URI</strong></th>
							<th><strong>Headers</strong></th>
							<th><strong>Body</strong></th>
						</tr>
					</thead>
					<tbody id="httpTable">

					</tbody>
				</table>"""

			@$el.html(html)

			window.serverRequest = (method, uri, headers = {}, body = null, successCallback, failureCallback) ->
				deferred = Q.pending()
				if !headers["Content-Type"]? and body?
					headers["Content-Type"] = "application/json"
				$("#httpTable").append('<tr class="server_row"><td><strong>' + method + '</strong></td><td>' + uri + '</td><td>' + (if headers.length == 0 then '' else JSON.stringify(headers)) + '</td><td>' + JSON.stringify(body) + '</td></tr>')
				if has 'ENV_BROWSER'
					require ['cs!server-glue/server'], (Server) ->
						deferred.fulfill(Server.app.process(method, uri, headers, body))
				else
					if body != null
						body = JSON.stringify(body)
					$.ajax uri,
						headers: headers
						data: body
						error: (jqXHR, textStatus, errorThrown) ->
							try
								error = JSON.parse(jqXHR.responseText)
							catch e
								error = jqXHR.responseText
							deferred.reject(jqXHR.status, error)

						success: (data, textStatus, jqXHR) ->
							rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg
							responseHeaders = {}
							responseHeadersString = jqXHR.getAllResponseHeaders()
							while match = rheaders.exec( responseHeadersString )
								responseHeaders[ match[1].toLowerCase() ] = match[2]
							deferred.fulfill(jqXHR.status, data, responseHeaders)

						type: method
				if successCallback?
					deferred.promise.then((args) -> successCallback(args...))
				if failureCallback?
					deferred.promise.catch((args) -> failureCallback(args...))
				return deferred.promise

			serverRequest('GET', '/onAir/')
			.then(([statusCode, result]) =>
				if result
					@model.trigger('onAir')
			)

		runServer: ->
			serverRequest('DELETE', '/cleardb')
			.then(=>
				serverRequest('PATCH', "/ui/textarea?$filter=name eq 'model_area'", {}, {
					name: 'model_area'
					text: @model.get('content')
					is_disabled: true
				})
			).then(->
				serverRequest('POST', '/execute/')
			).done(=>
				@model.trigger('onAir')
				console.log("Executing model successfull!")
			)
	)
)

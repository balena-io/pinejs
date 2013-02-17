define([
	'backbone'
	'cs!server-glue/server'
], (Backbone, SBVRServer) ->
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

			window.serverRequest = (method, uri, headers = {}, body = null, successCallback=(->), failureCallback=->) ->
				if !headers["Content-Type"]? and body?
					headers["Content-Type"] = "application/json"
				$("#httpTable").append "<tr class=\"server_row\"><td><strong>" + method + "</strong></td><td>" + uri + "</td><td>" + (if headers.length == 0 then "" else JSON.stringify(headers)) + "</td><td>" + JSON.stringify(body) + "</td></tr>"
				SBVRServer.app.process(method, uri, headers, body, successCallback, failureCallback)

		runServer: ->
			serverRequest("DELETE", "/cleardb", {}, null, =>
				serverRequest("PUT", "/ui/textarea-is_disabled?$filter=textarea/name eq model_area", {}, null, =>
					serverRequest("PUT", "/ui/textarea?$filter=name eq model_area", {}, {'textarea.text': @model.get('content')}, =>
						serverRequest("POST", "/execute/", {}, null, =>
							@model.trigger('onAir')
							console.log("Executing model successfull!")
						)
					)
				)
			)
	)
)

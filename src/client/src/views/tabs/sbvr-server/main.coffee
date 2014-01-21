define [
	'backbone'
	'has'
	'cs!server-request'
], (Backbone, has, serverRequest) ->
	Backbone.View.extend(
		events:
			"click #run-server": "runServer"

		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			@setTitle('Server')

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

			serverRequest('GET', '/onAir/')
			.then(([statusCode, result]) =>
				if result
					@model.trigger('onAir')
			)

		runServer: ->
			serverRequest('DELETE', '/cleardb')
			.then(=>
				serverRequest('PATCH', "/ui/textarea?$filter=name eq 'model_area'", {}, {
					text: @model.get('content')
					is_disabled: true
				})
			).then(->
				serverRequest('POST', '/execute/')
			).done =>
				@model.trigger('onAir')
				console.log("Executing model successfull!")
	)

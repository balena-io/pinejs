define [
	'backbone'
	'server-request'
], (Backbone, serverRequest) ->
	Backbone.View.extend(
		initialize: (@options) ->

		events:
			'click #run-request': 'runRequest'
			'click #run-server': 'runServer'

		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			@setTitle('Server')

			html = """
				<input id="request" class="input-block-level" placeholder="/data/resource?$filter=a eq 'b'" />
				<button id="run-server">Run Server</button>
				<button id="run-request">Run Request</button>
				<table class='textTable table table-striped'>
					<thead>
						<tr>
							<th><strong>Method</strong></th>
							<th><strong>URI</strong></th>
							<th><strong>Headers</strong></th>
							<th><strong>Body</strong></th>
							<th><strong>Result</strong></th>
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

		runRequest: ->
			request = @$('#request').val()
			serverRequest('GET', request)

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
				console.log('Executing model successfull!')
	)

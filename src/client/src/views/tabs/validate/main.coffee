define([
	'backbone'
	'codemirror'
	'async'
	'codemirror-ometa-bridge/hinter'
], (Backbone, CodeMirror, async, ometaAutoComplete) ->
	Backbone.View.extend(
		events:
			"click #validate": "validate"

		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Validate')
			
			html = """
				<div id="validate" class="btn btn-small btn-primary">Validate</div>
				<textarea id="validateEditor" />
				<h3>Validation Results</h3>
				<table class="table table-bordered table-striped">
					<thead>
						<tr></tr>
					</thead>
					<tbody>
					</tbody>
				</table>"""

			@$el.html(html)
			textarea = @$('#validateEditor')
			
			@editor = CodeMirror.fromTextArea(textarea.get(0),
				mode: {
					name: 'sbvr'
					getOMetaEditor: () => @editor
					prependText: () => @model.get('content') + '\nRule: '
				}
				onKeyEvent: ometaAutoComplete(() => @model.get('content') + '\nRule: ')
				lineWrapping: true
			)

			$(window).resize(=>
				@editor.setSize(@$el.width(), 40)
			).resize()
		validate: ->
			async.parallel(
				models: (callback) ->
					serverRequest('GET', '/data/', {}, null,
						(statusCode, result) ->
							console.log(result)
							callback(false, result)
						-> callback(true)
					)
				invalid: (callback) =>
					serverRequest('POST', '/validate/', {}, {rule: @editor.getValue()},
						(statusCode, result) ->
							callback(false, result)
						-> callback(true)
					)
				(err, results) =>
					if err?
						console.error('Error validating')
						return
					{models, invalid} = results
					
					colNames = []
					colModel = []
					for field in invalid.__model.fields
						colNames.push(field[1])
						colModel.push(
							name: field[1]
						)
					
					fetchCols = []
					
					resourceName = invalid.__model.resourceName
					for own modelName, model of models
						if (modelNameParts = model.resourceName.split('-')).length > 2 and
								modelNameParts[0] == resourceName and
								modelNameParts[2] not in colNames
							colNames.push(modelNameParts[2] + '(id: name)')
							colModel.push(
								name: modelNameParts[2]
							)
							fetchCols.push(model)
					
					async.map(invalid.d,
						(instance, callback) ->
							async.map(fetchCols,
								(model, callback) ->
									serverRequest('GET', '/data/' + model.resourceName + '?$filter=' + invalid.__model.resourceName + ' eq ' + instance[invalid.__model.idField], {}, null,
										(statusCode, fetchCol) ->
											async.forEach(fetchCol.d,
												(instance, callback) ->
													fkName = model.resourceName.split('-')[2]
													serverRequest('GET', '/data/' + fkName + '?$filter=' + models[fkName].idField + ' eq ' + instance[fkName].__id, {}, null,
														(statusCode, results) ->
															if results.d.length > 0
																instance[fkName] = results.d[0][results.__model.referenceScheme]
															callback()
														callback
													)
												(err) ->
													callback(err, fetchCol)
											)
										-> callback(arguments)
									)
								callback
							)
						(err, fetchCols) =>
							if err
								console.error('Error validating', err)
								return
							header = @$("thead tr")
							results = @$("tbody")
							header.empty()
							results.empty()

							for name in colNames
								column = $(document.createElement('th')).text(name)
								header.append(column)

							for instance, i in invalid.d
								for fetchCol in fetchCols[i] when fetchCol?
									fkName = fetchCol.__model.resourceName.split('-')[2]
									instance[fkName] = (fetchInstance[fetchCol.__model.idField] + ': ' + fetchInstance[fkName] for fetchInstance in fetchCol.d).join('\n')

								row = $(document.createElement('tr'))
								for column in colModel
									cell = $(document.createElement('td'))
									cell.text(instance[column.name])
									row.append(cell)
								results.append(row)
					)
			)
	)
)


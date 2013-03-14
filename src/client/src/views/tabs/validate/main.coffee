define([
	'backbone'
	'codemirror'
	'async'
	'codemirror-ometa/hinter'
], (Backbone, CodeMirror, async, codeMirrorOmetaHinter) ->
	Backbone.View.extend(
		events:
			"click #validate": "validate"

		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Validate')
			
			html = """
				<textarea id="validateEditor" />
				<div id="validate" class="btn btn-small btn-primary">Validate</div>
				<div id="results" style="display: none">
					<h3>Invalid items:</h3>
					<table class="table table-bordered table-striped">
						<thead>
							<tr></tr>
						</thead>
						<tbody>
						</tbody>
					</table>
				</div>
				<div id="noresults" style="display: none">
					<h3>No invalid items in database</h3>
				</div>"""

			@$el.html(html)
			textarea = @$('#validateEditor')
			
			@editor = CodeMirror.fromTextArea(textarea.get(0),
				mode: {
					name: 'sbvr'
					getOMetaEditor: () => @editor
					prependText: () => @model.get('content') + '\nRule: '
				}
				onKeyEvent: codeMirrorOmetaHinter(=> @model.get('content') + '\nRule: ')
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
							callback(null, result)
						-> callback(arguments)
					)
				invalid: (callback) =>
					serverRequest('POST', '/validate/', {}, {rule: @editor.getValue()},
						(statusCode, result) ->
							callback(null, result)
						-> callback(arguments)
					)
				(err, results) =>
					if err
						console.error('Error validating', err)
						return
					{models, invalid} = results
					
					colNames = []
					colResourceNames = []
					colModel = []
					fkCols = []
					
					for {dataType, fieldName} in invalid.__model.fields
						resourceName = fieldName.replace(/\ /g, '_')
						if dataType == 'ForeignKey'
							colNames.push(fieldName + '(id: name)')
							fkCols.push(models[resourceName])
						else
							colNames.push(fieldName)
						colModel.push(
							name: fieldName
						)
						colResourceNames.push(resourceName)
					
					manyToManyCols = []
					
					resourceName = invalid.__model.resourceName
					for own modelName, model of models
						if (modelNameParts = model.resourceName.split('-')).length > 2 and
								modelNameParts[0] == resourceName and
								modelNameParts[2] not in colResourceNames
							colNames.push(modelNameParts[2] + '(id: name)')
							colModel.push(
								name: modelNameParts[2]
							)
							manyToManyCols.push(model)
					
					async.map(invalid.d,
						(instance, callback) ->
							async.parallel([
									(callback) ->
										async.map(fkCols,
											(model, callback) ->
												serverRequest('GET', instance[model.modelName].__deferred.uri, {}, null,
													(statusCode, fkCol) ->
														if fkCol.d.length > 0
															instance[model.modelName] = fkCol.d[0][model.idField] + ': ' + fkCol.d[0][model.referenceScheme]
														callback()
													-> callback(arguments)
												)
											callback
										)
									(callback) ->
										async.map(manyToManyCols,
											(model, callback) ->
												serverRequest('GET', '/data/' + model.resourceName + '?$filter=' + invalid.__model.resourceName + ' eq ' + instance[invalid.__model.idField], {}, null,
													(statusCode, manyToManyCol) ->
														async.forEach(manyToManyCol.d,
															(instance, callback) ->
																fkName = model.resourceName.split('-')[2]
																serverRequest('GET', instance[fkName].__deferred.uri, {}, null,
																	(statusCode, results) ->
																		if results.d.length > 0
																			instance[fkName] = results.d[0][results.__model.referenceScheme]
																		callback()
																	-> callback(arguments)
																)
															(err) ->
																callback(err, manyToManyCol)
														)
													-> callback(arguments)
												)
											callback
										)
								]
								(err, [ignoredFKs, manyToManyCols]) -> callback(err, manyToManyCols)
							)
						(err, manyToManyCols) =>
							if err
								console.error('Error validating', err)
								return

							console.log "invalid items:", invalid.d.length, invalid.d.length == 0, invalid.d

							results_div = @$("#results")
							noresults_div = @$("#noresults")

							if invalid.d.length == 0
								results_div.hide()
								noresults_div.show()

							else
								results_div.show()
								noresults_div.hide()

								header = @$("thead tr")
								results = @$("tbody")
								header.empty()
								results.empty()

								for name in colNames
									column = $(document.createElement('th')).text(name)
									header.append(column)

								for instance, i in invalid.d
									for manyToManyCol in manyToManyCols[i] when manyToManyCol?
										fkName = manyToManyCol.__model.resourceName.split('-')[2]
										instance[fkName] = (manyToManyInstance[manyToManyCol.__model.idField] + ': ' + manyToManyInstance[fkName] for manyToManyInstance in manyToManyCol.d).join('\n')

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


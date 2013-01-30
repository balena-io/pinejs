require(['async'], () ->
	runTrans = (rootElement) ->
		actions = $(".action:has(#__actype[value!=view])")
		if actions.size() > 0
			# get 'trans' action resource to extract the URIs
			serverRequest("GET", '/transaction', {}, null, (statusCode, transURIs, headers) ->
				# create transaction resource
				serverRequest('POST', transURIs.transactionURI, {}, null, (statusCode, transaction, headers) ->
					transactionID = transaction.id
					
					# find and lock relevant resources (l,t-l,r-l)
					async.map(actions.toArray(),
						(instance, callback) ->
							$this = $(instance)
							action = $this.children("#__actype").val()
							resourceType = $this.children("#__type").val()
							resourceID = $this.children("#__id").val()
							switch action
								when 'edit', 'add'
									inputs = $(":input:not(:submit)", $this)
									fields = []
									for input in inputs when input.id[0...2] != "__"
										fields.push(
											name: input.id
											value: $(input).val()
										)
									if action == 'edit'
										lockResource(resourceType, resourceID, transURIs, transactionID, (err, lockID) ->
											if err?
												callback(err)
											else
												callback(null, [resourceType, action, lockID, fields])
										)
									else
										callback(null, [resourceType, action, resourceID, fields])
								when 'del'
									lockResource(resourceType, resourceID, transURIs, transactionID, (err, lockID) ->
										if err?
											callback(err)
										else
											callback(null, [resourceType, action, lockID])
									)
								else
									callback(['Unknown transaction action', action])
						(err, data) ->
							if err?
								console.error(err)
								# TODO: Should probably clean up the transaction
							else
								async.forEach(data,
									(dataElement, callback) ->
										sendData =
											transaction: transactionID
											lock: null
											'resource type': dataElement[0]
											'conditional type': ''
											placeholder: ''
										switch dataElement[1]
											when "del"
												sendData['conditional type'] = 'DELETE'
												sendData.lock = dataElement[2]
											when 'edit'
												sendData['conditional type'] = 'EDIT'
												sendData.lock = dataElement[2]
											when 'add'
												sendData['conditional type'] = 'ADD'
												sendData.placeholder = dataElement[2]
										switch dataElement[1]
											when "del"
												serverRequest("POST", transURIs.conditionalResourceURI, {}, sendData,
													-> callback()
													-> callback(arguments)
												)
											when 'edit', 'add'
												fields = dataElement[3]
												serverRequest("POST", transURIs.conditionalResourceURI, {}, sendData,
													(statusCode, condResource, headers) ->
														async.forEach(fields,
															(field, callback) ->
																fieldData =
																	'conditional resource': condResource.id
																	'field name': field.name 
																	'field value': field.value
																serverRequest("POST", transURIs.conditionalFieldURI, {}, fieldData,
																	-> callback()
																	-> callback(arguments)
																)
															callback
														)
													-> callback(arguments)
												)
											else
												callback(['Unknown transaction op', dataElement[1]])
									(err) ->
										if err?
											console.error(err)
										else
											serverRequest("POST", transURIs.commitTransactionURI, null, {id: transactionID},
												(statusCode, result, headers) ->
													location.hash = "#!/data/"
												(statusCode, errors) -> 
													console.error(statusCode, errors)
											)
								)
					)
				)
			)


		lockResource = (resourceType, resourceID, transURIs, transactionID, callback) ->
			failureCallback = -> callback(arguments)
			o =
				'is exclusive': true
				transaction: transactionID
			serverRequest("POST", transURIs.lockURI, {}, o, ((statusCode, lock, headers) ->
				o =
					'resource id': parseInt(resourceID, 10)
					'resource type': resourceType
				serverRequest("POST", transURIs.resourceURI, {}, o, ((statusCode, resource, headers) ->
					o =
						resource: resource.id
						lock: lock.id
					serverRequest("POST", transURIs.lockResourceURI, {}, o, ((statusCode, result, headers) ->
						callback(null, lock.id)
					), failureCallback)
				), failureCallback)
			), failureCallback)

	window?.runTrans = runTrans
)
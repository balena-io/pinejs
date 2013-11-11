define ['async', 'bluebird', 'cs!server-request'], (async, Promise, serverRequest) ->
	runTrans = (rootElement) ->
		actions = $(".action:has(#__actype[value!=view])")
		if actions.size() > 0
			# get 'trans' action resource to extract the URIs
			serverRequest('GET', '/transaction')
			.then(([statusCode, transURIs]) ->
				# create transaction resource
				serverRequest('POST', transURIs.transactionURI)
				.then(([statusCode, transaction, headers]) ->
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
										lockResource resourceType, resourceID, transURIs, transactionID, (err, lockID) ->
											if err?
												callback(err)
											else
												callback(null, [resourceType, action, lockID, fields])
									else
										callback(null, [resourceType, action, resourceID, fields])
								when 'del'
									lockResource resourceType, resourceID, transURIs, transactionID, (err, lockID) ->
										if err?
											callback(err)
										else
											callback(null, [resourceType, action, lockID])
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
											resource_type: dataElement[0]
											conditional_type: ''
											placeholder: ''
										switch dataElement[1]
											when "del"
												sendData.conditional_type = 'DELETE'
												sendData.lock = dataElement[2]
											when 'edit'
												sendData.conditional_type = 'EDIT'
												sendData.lock = dataElement[2]
											when 'add'
												sendData.conditional_type = 'ADD'
												sendData.placeholder = dataElement[2]
										switch dataElement[1]
											when "del"
												serverRequest('POST', transURIs.conditionalResourceURI, {}, sendData).nodeify(callback)
											when 'edit', 'add'
												fields = dataElement[3]
												serverRequest('POST', transURIs.conditionalResourceURI, {}, sendData)
												.then(([statusCode, condResource]) ->
													Promise.all _.map fields, (field, callback) ->
														fieldData =
															conditional_resource: condResource.id
															field_name: field.name
															field_value: field.value
														serverRequest("POST", transURIs.conditionalFieldURI, {}, fieldData)
												).nodeify(callback)
											else
												callback(['Unknown transaction op', dataElement[1]])
									(err) ->
										if err?
											console.error(err)
										else
											serverRequest("POST", transURIs.commitTransactionURI, null, {id: transactionID},
												(statusCode, result, headers) ->
													dduiState('#!/data/')
												(statusCode, errors) ->
													console.error(statusCode, errors)
											)
								)
					)
				)
			)


		lockResource = (resourceType, resourceID, transURIs, transactionID, callback) ->
			o =
				is_exclusive: true
				transaction: transactionID
			lock = serverRequest('POST', transURIs.lockURI, {}, o)

			o =
				resource_id: parseInt(resourceID, 10)
				resource_type: resourceType
			resource = serverRequest('POST', transURIs.resourceURI, {}, o)

			Promise.all(lock, resource)
			.spread(([statusCode1, lock], [statusCode2, resource]) ->
				o =
					resource: resource.id
					lock: lock.id
				serverRequest('POST', transURIs.lockResourceURI, {}, o)
				.then(->
					return lock.id
				)
			).nodeify(callback)

	window?.runTrans = runTrans

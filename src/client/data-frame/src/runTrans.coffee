require(['utils/createAsyncQueueCallback'], (createAsyncQueueCallback) ->
	runTrans = (rootElement) ->
		actions = $(".action")
		if actions.size() > 0
			# get 'trans' action resource to extract the URIs
			serverRequest("GET", '/transaction', {}, null, (statusCode, transURIs, headers) ->
				# create transaction resource
				serverRequest('POST', transURIs.transactionURI, {}, null, (statusCode, transaction, headers) ->
					transactionID = transaction.id
					lockCount = 0
					data = []
					locksCallback = createAsyncQueueCallback(
						(data) -> 
							asyncCallback = createAsyncQueueCallback(
									() -> 
										serverRequest("POST", transURIs.commitTransactionURI, null, {id: transactionID},
											(statusCode, result, headers) ->
												location.hash = "#!/data/"
											(statusCode, errors) -> 
												console.error(statusCode, errors)
										)
									(errors) -> 
										console.error(errors)
								)
							for dataElement in data
								sendData = [
									transaction: transactionID
									lock: null
									resource_type: dataElement[0]
									conditional_type: ''
									placeholder: ''
								]
								switch dataElement[1]
									when "del"
										sendData[0].conditional_type = 'DELETE'
										sendData[0].lock = dataElement[2]
									when 'edit'
										sendData[0].conditional_type = 'EDIT'
										sendData[0].lock = dataElement[2]
									when 'add'
										sendData[0].conditional_type = 'ADD'
										sendData[0].placeholder = dataElement[2]
								asyncCallback.addWork(1)
								switch dataElement[1]
									when "del"
										serverRequest("POST", transURIs.conditionalResourceURI, {}, sendData, asyncCallback.successCallback, asyncCallback.errorCallback)
									when 'edit', 'add'
										fields = dataElement[3]
										do (fields) ->
											serverRequest("POST", transURIs.conditionalResourceURI, {}, sendData,
												(statusCode, condResource, headers) ->
													fieldsCallback = createAsyncQueueCallback(asyncCallback.successCallback, asyncCallback.errorCallback)
													for field in fields
														for own key, value of field
															fieldData = [
																conditional_resource: condResource.id
																field_name: key 
																field_value: value
															]
															fieldsCallback.addWork(1)
															serverRequest("POST", transURIs.conditionalFieldURI, {}, fieldData, fieldsCallback.successCallback, fieldsCallback.errorCallback)
													fieldsCallback.endAdding()
												asyncCallback.errorCallback
											)
									else
										console.error('Unknown transaction op', dataElement[1])
							asyncCallback.endAdding()
						(errors) -> 
							console.error(errors)
						(resourceType, op, lockOrPlaceholderID = null, fields = {}) ->
							return [ resourceType, op, lockOrPlaceholderID, fields ]
					)
					
					# find and lock relevant resources (l,t-l,r-l)
					actions.each((index) ->
						$this = $(this)
						action = $this.children("#__actype").val()
						if action == 'view'
							return
						locksCallback.addWork(1)
						resourceType = $this.children("#__type").val()
						resourceID = $this.children("#__id").val()
						switch action
							when 'edit', 'add'
								addEditCallback = (lockID) ->
									inputs = $(":input:not(:submit)", $this)
									o = $.map(inputs, (n, i) ->
										if n.id[0...2] != "__"
											ob = {}
											ob[n.id] = $(n).val()
											return ob
									)
									locksCallback.successCallback(resourceType, action, lockID, o)
								if action == 'edit'
									lockResource(resourceType, resourceID, transURIs, transactionID, addEditCallback, locksCallback.errorCallback)
								else if action == 'add'
									addEditCallback(resourceID)
							when 'del'
								lockResource(resourceType, resourceID, transURIs, transactionID,
									(lockID) ->
										locksCallback.successCallback(resourceType, action, lockID)
									locksCallback.errorCallback
								)
							else
								locksCallback.errorCallback('Unknown transaction action', action)
					)
					locksCallback.endAdding(1)
				)
			)


		lockResource = (resourceType, resourceID, transURIs, transactionID, successCallback, failureCallback) ->
			o = [ 'is exclusive': true, transaction: transactionID ]
			serverRequest("POST", transURIs.lockURI, {}, o, ((statusCode, lock, headers) ->
				o = [ resource_id: parseInt(resourceID, 10), resource_type: resourceType]
				serverRequest("POST", transURIs.resourceURI, {}, o, ((statusCode, resource, headers) ->
					o = [ resource: resource.id, lock: lock.id ]
					serverRequest("POST", transURIs.lockResourceURI, {}, o, ((statusCode, result, headers) ->
						successCallback(lock.id)
					), failureCallback)
				), failureCallback)
			), failureCallback)

	window?.runTrans = runTrans
)
require(['utils/createAsyncQueueCallback'], (createAsyncQueueCallback) ->
	runTrans = (rootElement) ->
		actions = $(".action")
		if actions.size() > 0
			# get 'trans' action resource to extract the URIs
			serverRequest("GET", '/transaction', {}, null, (statusCode, trans, headers) ->
				# create transaction resource
				serverRequest('POST', trans.transactionURI, {}, null, (statusCode, transaction, headers) ->
					lockCount = 0
					data = []
					callback = (op, lockID, fields = {}) ->
						data.push([ op, lockID, fields ])
						if data.length == lockCount
							asyncCallback = createAsyncQueueCallback(
									() -> 
										serverRequest("POST", trans.commitTransactionURI, {id: transaction.id}, null,
											(statusCode, result, headers) ->
												location.hash = "#!/data/"
											(statusCode, errors) -> 
												console.error(statusCode, errors)
										)
									(errors) -> 
										console.error(errors)
								)
							for dataElement in data
								switch dataElement[0]
									when "del"
										asyncCallback.addWork(1)
										sendData = [
											lock: dataElement[1]
											field_name: '__DELETE' 
											field_type: ''
											field_value: ''
										]
										do(sendData) ->
											serverRequest("DELETE", trans.conditionalRepresentationURI + '?filter=lock:' + sendData[0].lock, {}, null,
												() -> serverRequest("PUT", trans.conditionalRepresentationURI, {}, sendData, asyncCallback.successCallback, asyncCallback.errorCallback)
												asyncCallback.errorCallback
											)
									when "edit"
										for pair in dataElement[2]
											for own key, value of pair
												sendData = [
													lock: dataElement[1]
													field_name: key 
													field_type: typeof value
													field_value: value
												]
												asyncCallback.addWork(1)
												do(sendData) ->
													serverRequest("DELETE", trans.conditionalRepresentationURI + '?filter=lock:' + sendData[0].lock, {}, null,
														() -> serverRequest("PUT", trans.conditionalRepresentationURI, {}, sendData, asyncCallback.successCallback, asyncCallback.errorCallback)
														asyncCallback.errorCallback
													)
									else
										console.error('Unknown transaction op', dataElement[0])
							asyncCallback.endAdding()
					
					# find and lock relevant resources (l,t-l,r-l)
					actions.each((index) ->
						action = $(this).children("#__actype").val()
						if action not in ["edit", "del"]
							return
						lockCount++
						resourceID = $(this).children("#__id").val()
						resourceType = $(this).children("#__type").val()
						switch action
							when 'edit'
								lockResource(resourceType, resourceID, trans,
									(lockID) ->
										inputs = $(":input:not(:submit)", rootElement)
										o = $.map(inputs, (n, i) ->
											if n.id[0...2] != "__"
												ob = {}
												ob[n.id] = $(n).val()
												return ob
										)
										callback(action, lockID, o)
									(statusCode, error)	->
										console.error(statusCode, error)
								)
							when 'del'
								lockResource(resourceType, resourceID, trans,
									(lockID) ->
										callback(action, lockID)
									(statusCode, error)	->
										console.error(statusCode, error)
								)
							when 'add'
								break
							else
								console.error('Unknown transaction action', action)
					)
				)
			)


		lockResource = (resource_type, resource_id, trans, successCallback, failureCallback) ->
			o = [ is_exclusive: true, transaction: trans.id ]
			serverRequest("POST", trans.lockURI, {}, o, ((statusCode, lock, headers) ->
				o = [ resource_id: parseInt(resource_id, 10), resource_type: resource_type]
				serverRequest("POST", trans.resourceURI, {}, o, ((statusCode, resource, headers) ->
					o = [ resource: resource.id, lock: lock.id ]
					serverRequest("POST", trans.lockResourceURI, {}, o, ((statusCode, result, headers) ->
						successCallback(lock.id)
					), failureCallback)
				), failureCallback)
			), failureCallback)

	window?.runTrans = runTrans
)
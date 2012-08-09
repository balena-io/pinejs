require(['utils/createAsyncQueueCallback'], (createAsyncQueueCallback) ->
	runTrans = (rootElement) ->
		if $(".action").size() > 0
			# fetch transaction collection location?(?) - [not needed as this is code on demand]
			# create transaction resource
			obj = [value:'trans']
			serverRequest('POST', '/transaction/transaction', {}, obj, (statusCode, result, headers) ->
				# get 'trans'action resource to extract lcURI,tlcURI,rcURI,lrcURI,xlcURI,slcURI,ctURI
				serverRequest("GET", headers.location, {}, null, (statusCode, trans, headers) ->
					lockCount = 0
					data = []
					callback = (op, lockID, fields = {}) ->
						data.push [ op, lockID, fields ]
						if data.length == lockCount
							cr_uri = "/transaction/conditional_representation"
							asyncCallback = createAsyncQueueCallback(
									() -> 
										serverRequest("POST", trans.ctURI, {}, null, (statusCode, result, headers) ->
											location.hash = "#!/data/"
										)
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
											serverRequest("DELETE", cr_uri + '*filt:lock=' + sendData[0].lock, {}, null, () ->
												serverRequest("PUT", cr_uri, {}, sendData, asyncCallback.successCallback)
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
													serverRequest("DELETE", cr_uri + '*filt:lock=' + sendData[0].lock, {}, null, () ->
														serverRequest("PUT", cr_uri, {}, sendData, asyncCallback.successCallback)
													)
							asyncCallback.endAdding()
					
					# find and lock relevant resources (l,t-l,r-l)
					$(".action").each((index) ->
						if $(this).children("#__actype").val() in ["editterm", "editfctp", "del"]
							lockCount++
					)
					$(".action").each((index) ->
						resourceID = $(this).children("#__id").val()
						resourceType = $(this).children("#__type").val()
						switch $(this).children("#__actype").val()
							when 'edit'
								lockResource resourceType, resourceID, trans, (lockID) ->
									inputs = $(":input:not(:submit)", rootElement)
									o = $.map(inputs, (n, i) ->
										if n.id[0...2] != "__"
											ob = {}
											ob[n.id] = $(n).val()
											return ob
									)
									callback("edit", lockID, o)
							when 'del'
								lockResource resourceType, resourceID, trans, (lockID) ->
									callback("del", lockID)
							when 'add'
								break
							else
								console.error('Unknown transaction action', $(this).children("#__actype").val())
					)
				)
			)


		lockResource = (resource_type, resource_id, trans, successCallback, failureCallback) ->
			serverRequest "POST", trans.lcURI, {}, [ value: "lok" ], ((statusCode, result, headers) ->
				serverRequest "GET", headers.location, {}, null, ((statusCode, lock, headers) ->
					lockID = lock.instances[0].id
					o = [ transaction: trans.id, lock: lockID ]
					serverRequest "POST", trans.tlcURI, {}, o, ((statusCode, result, headers) ->
						o = [ id: lockID ]
						serverRequest "POST", trans.xlcURI, {}, o, ((statusCode, result, headers) ->
							o = [ resource_id: parseInt(resource_id, 10), resource_type: resource_type]
							serverRequest "POST", trans.rcURI, {}, o, ((statusCode, result, headers) ->
								serverRequest "GET", headers.location, {}, null, ((statusCode, resource, headers) ->
									o = [ resource: resource.instances[0].id, lock: lockID ]
									serverRequest "POST", trans.lrcURI, {}, o, ((statusCode, result, headers) ->
										successCallback(lockID)
									), failureCallback
								), failureCallback
							), failureCallback
						), failureCallback
					), failureCallback
				), failureCallback
			), failureCallback

	window?.runTrans = runTrans
)
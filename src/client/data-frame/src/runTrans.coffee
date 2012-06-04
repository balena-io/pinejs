runTrans = (rootElement) ->
	if $(".action").size() > 0
		# fetch transaction collection location?(?) - [not needed as this is code on demand]
		# create transaction resource
		obj = [name:'trans']
		serverRequest('POST', '/data/transaction', {}, obj, (statusCode, result, headers) ->
			# get 'trans'action resource to extract lcURI,tlcURI,rcURI,lrcURI,xlcURI,slcURI,ctURI
			serverRequest("GET", headers.location, {}, null, (statusCode, trans, headers) ->
				lockCount = 0
				data = []
				callback = (op, cr_uri, o = {}) ->
					data.push [ op, cr_uri, o ]
					if data.length == lockCount
						i = 0
						nextLoopCallback = ->
							if i < data.length
								dataElement = data[i]
								i++
								switch dataElement[0]
									when "del"
										serverRequest "DELETE", dataElement[1], {}, null, nextLoopCallback
									when "edit"
										serverRequest "PUT", dataElement[1], {}, dataElement[2], nextLoopCallback
							else
								serverRequest "POST", trans.ctURI, {}, null, (statusCode, result, headers) ->
									location.hash = "#!/data/"
						nextLoopCallback()
				
				# find and lock relevant resources (l,t-l,r-l)
				$(".action").each((index) ->
					if $(this).children("#__actype").val() in ["editterm", "editfctp", "del"]
						lockCount++
				)
				$(".action").each((index) ->
					resourceID = $(this).children("#__id").val()
					resourceType = $(this).children("#__type").val()
					switch $(this).children("#__actype").val()
						when "editfctp", "editterm"
							lockResource resourceType, resourceID, trans, (lockID) ->
								cr_uri = "/data/lock*filt:lock.id=" + lockID + "/cr"
								inputs = $(":input:not(:submit)", rootElement)
								o = $.map(inputs, (n, i) ->
									if n.id[0...2] != "__"
										ob = {}
										ob[n.id] = $(n).val()
										return ob
								)
								callback("edit", cr_uri, o)
						when "del"
							lockResource resourceType, resourceID, trans, (lockID) ->
								cr_uri = "/data/lock*filt:lock.id=" + lockID + "/cr"
								callback("del", cr_uri)
						when "addterm", "addfctp"
							break
				)
			)
		)


	lockResource = (resource_type, resource_id, trans, successCallback, failureCallback) ->
		serverRequest "POST", trans.lcURI, {}, [ name: "lok" ], ((statusCode, result, headers) ->
			serverRequest "GET", headers.location, {}, null, ((statusCode, lock, headers) ->
				lockID = lock.instances[0].id
				o = [ transaction: trans.id, lock: lockID ]
				serverRequest "POST", trans.tlcURI, {}, o, ((statusCode, result, headers) ->
					o = [ lock: lockID ]
					serverRequest "POST", trans.xlcURI, {}, o, ((statusCode, result, headers) ->
						o = [ resource: parseInt(resource_id), resource_type: resource_type, lock: lockID ]
						serverRequest "POST", trans.lrcURI, {}, o, ((statusCode, result, headers) ->
							successCallback(lockID)
						), failureCallback
					), failureCallback
				), failureCallback
			), failureCallback
		), failureCallback

window?.runTrans = runTrans
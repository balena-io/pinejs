window.runTrans = ->
	parent = this
	transuri = ""

	@lockCount = 0
	@data = []

	if $(".action").size() > 0
		#fetch transaction collection location?(?) - [not needed as this is code on demand]
		#create transaction resource
		obj = [name:'trans']
		serverRequest('POST', '/data/transaction', [], JSON.stringify(obj), (statusCode, result, headers) ->
			parent.transuri = headers.location
			#get 'trans'action resource to extract lcURI,tlcURI,rcURI,lrcURI,xlcURI,slcURI,ctURI
			serverRequest("GET", parent.transuri, [], '', (statusCode, trans, headers) ->
				parent.trans = trans;
				#find and lock relevant resources (l,t-l,r-l)
				$(".action").each((index) ->
					if $(this).children("#__actype").val() in ["editterm", "editfctp", "del"]
						parent.lockCount++
				)
				$(".action").each((index) ->
					@trans = parent.trans
					@resource_id = $(this).children("#__id").val()
					@resource_type = $(this).children("#__type").val()
					@callback = parent.callback
					@parent = parent
					lockr = new locker()
					switch $(this).children("#__actype").val()
						when "editfctp", "editterm"
							lockr.lockResource @resource_type, @resource_id, @trans, (lock_id) ->
								cr_uri = "/data/lock*filt:lock.id=" + lock_id + "/cr"
								inputs = $(":input:not(:submit)", parent)
								o = $.map(inputs, (n, i) ->
									if n.id[0...2] != "__"
										ob = {}
										ob[n.id] = $(n).val()
										return ob
								)
								parent.callback("edit", cr_uri, o)
						when "del"
							lockr.lockResource @resource_type, @resource_id, @trans, (lock_id) ->
								cr_uri = "/data/lock*filt:lock.id=" + lock_id + "/cr"
								parent.callback "del", cr_uri, {}	
						when "addterm", "addfctp"
							break
				)
			)
		)

	@callback = (op, cr_uri, o) ->
		@parent.data.push [ op, cr_uri, o ]
		if @parent.data.length == @parent.lockCount
			for dataElement in @parent.data
				switch dataElement[0]
					when "del"
						serverRequest "DELETE", dataElement[1]
					when "edit"
						serverRequest "PUT", dataElement[1], [], JSON.stringify(dataElement[2])
			serverRequest "POST", @parent.trans.ctURI, [], "", (statusCode, result, headers) ->
				location.hash = "#!/data/"


locker = ->
	@lockResource = (resource_type, resource_id, trans, successCallback, failureCallback) ->
		parent = this
		@resource_type = resource_type
		@resource_id = resource_id
		@trans = trans
		@successCallback = successCallback
		@failureCallback = failureCallback
		serverRequest "POST", trans.lcURI, [], JSON.stringify([ name: "lok" ]), ((statusCode, result, headers) ->
			serverRequest "GET", headers.location, [], "", ((statusCode, lock, headers) ->
				parent.lock = lock
				o = [ transaction_id: parent.trans.id, lock_id: parent.lock.instances[0].id ]
				serverRequest "POST", parent.trans.tlcURI, [], JSON.stringify(o), ((statusCode, result, headers) ->
					o = [ lock_id: parent.lock.instances[0].id ]
					serverRequest "POST", parent.trans.xlcURI, [], JSON.stringify(o), ((statusCode, result, headers) ->
						o = [ resource_id: parseInt(parent.resource_id), resource_type: parent.resource_type, lock_id: parent.lock.instances[0].id ]
						serverRequest "POST", parent.trans.lrcURI, [], JSON.stringify(o), ((statusCode, result, headers) ->
							successCallback(parent.lock.instances[0].id)
						), failureCallback
					), failureCallback
				), failureCallback
			), failureCallback
		), failureCallback
	return this

window?.runTrans = runTrans
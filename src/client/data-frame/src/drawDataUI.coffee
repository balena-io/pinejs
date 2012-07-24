define(['data-frame/ClientURIUnparser', 'utils/createAsyncQueueCallback', 'ejs'], (ClientURIUnparser, createAsyncQueueCallback, ejs) ->
	widgets = {}
	requirejs(['data-frame/widgets/inputText'], (inputText) ->
		widgets.inputText = inputText
	)
	
	

	createHiddenInputs = ejs.compile('''
		<input type="hidden" id="__actype" value="<%= action %>">
		<input type="hidden" id="__serverURI" value="<%= serverURI %>">
		<input type="hidden" id="__backURI" value="<%= backURI %>">
		<input type="hidden" id="__type" value="<%= type %>">
		<% if(id != null && id !== false) { %>
			<input type="hidden" id="__id" value="<%= id %>">
		<% } %>
		''')
	
	createNavigableTree = (tree, descendTree = []) ->
		tree = jQuery.extend(true, [], tree)
		descendTree = jQuery.extend(true, [], descendTree)
		
		previousLocations = []
		currentLocation = tree

		getIndexForResource = (resourceName, resourceID) ->
			for leaf, j in currentLocation when leaf[0] in ['collection', 'instance'] and leaf[1]?[0] == resourceName and (
					!resourceID? or (leaf[1][1] != undefined and leaf[1][1] in resourceID))
				return j
			return false
		
		ascend = () ->
			currentLocation = previousLocations.pop()
			return descendTree.pop()
		
		descendByIndex = (index) ->
			descendTree.push(index)
			previousLocations.push(currentLocation)
			currentLocation = currentLocation[index]
		
		# Descend to correct level
		for index in descendTree
			previousLocations.push(currentLocation)
			currentLocation = currentLocation[index]
		
		return {
			# Can get rid of?
			getCurrentLocation: () -> return currentLocation
			getCurrentIndex: () -> return descendTree[descendTree.length - 1]
			descendByIndex: (index) ->
				descendByIndex(index)
				return this
			getAbout: () ->
				if currentLocation[1]?[0]?
					currentLocation[1][0]
				else
					currentLocation[0]
			getAction: (resourceName, resourceID) ->
				index = getIndexForResource(resourceName, resourceID)
				if index != false
					currBranch = currentLocation[index]
					for currBranchType in currBranch[2][1..] when currBranchType[0] in ['view','edit','del']
						return currBranchType[0]
				return 'view'
			getPid: () ->
				pidTree = tree
				pid = pidTree[1][0]
				for index in descendTree
					pidTree = pidTree[index]
					if pidTree[0] is 'collection'
						pid += "--" + pidTree[1][0]
					else
						pid += "--" + pidTree[1][1]
				return pid
			# Needed
			getServerURI: () ->
				op =
					eq: "="
					ne: "!="
					lk: "~"
				filters = []
				for leaf in currentLocation[2] when leaf[0] == "filt"
					leaf = leaf[1]
					if leaf[1][0] == undefined
						# The resource name - not currently used in filter
						leaf[1] = this.getAbout()
					filters.push([leaf[2], op[leaf[0]], leaf[3]])
				return serverAPI(this.getAbout(), filters)
			isExpanded: (resourceName, resourceID) -> getIndexForResource(resourceName, resourceID) != false
			descend: (resourceName, resourceID) ->
				index = getIndexForResource(resourceName, resourceID)
				descendByIndex(index)
				return this
			modify: (action, change) ->
				switch action
					when "add"
						currentLocation.push(change)
					when "del"
						oldIndex = ascend()
						currentLocation.splice(oldIndex, 1)
				return this
			getURI: () ->
				return ClientURIUnparser.match(tree, "trans")
			clone: () ->
				return createNavigableTree(tree, descendTree)
			getChangeURI: (action, resourceName, resourceID) ->
				resource = [ resourceName ]
				if resourceID?
					resource.push(resourceID)
				return this.getNewURI("add", [ 'instance', resource, [ "mod", [ action ] ] ])
			getNewURI: (action, change) ->
				return this.clone().modify(action, change).getURI()
		}
	
	
	getResolvedFactType = (factType, factTypeInstance, successCallback, errorCallback) ->
		factTypeInstance = $.extend(true, [], factTypeInstance)
		asyncCallback = createAsyncQueueCallback(
			() ->
				successCallback(factTypeInstance)
			errorCallback
		)
		isBooleanFactType = factType.length == 3
		for factTypePart, i in factType
			if factTypePart[0] == "Term"
				asyncCallback.addWork(1)
				idField = if isBooleanFactType then 'id' else factTypePart[1]
				valueField = factTypePart[1]
				uri = serverAPI(factTypePart[1], [['id', '=', factTypeInstance[idField]]])
				serverRequest("GET", uri, {}, null,
					do(valueField) ->
						(statusCode, result, headers) ->
							factTypeInstance[valueField] = result.instances[0]
							asyncCallback.successCallback()
					asyncCallback.errorCallback
				)
		asyncCallback.endAdding()
	
	getTermResults = (factType, successCallback) ->
		termResults = {}
		for factTypePart in factType when factTypePart[0] == "Term"
			termResults[factTypePart[1]] = []

		# Get results for all the terms and process them once finished
		resultsReceived = 0
		resultsRequested = Object.keys(termResults).length
		for termName of termResults
			serverRequest("GET", serverAPI(termName), {}, null, do(termName) ->
				(statusCode, result, headers) ->
					termResults[termName] = result.instances
					resultsReceived++

					# If all requests have returned then construct dropdowns & form
					if resultsReceived == resultsRequested
						successCallback(termResults)
			)

	serverAPI = (about, filters = []) ->
		filterString = ''

		# render filters
		for filter in filters
			filterString += filter[0] + filter[1] + filter[2] + ";"
		
		if filterString != ''
			filterString = "*filt:" + filterString
		"/data/" + about + filterString

	drawData = (tree) ->
		tree = createNavigableTree(tree)
		rootURI = location.pathname
		$("#dataTab").html("<table id='terms'><tbody><tr><td></td></tr></tbody></table><div align='left'><br/><input type='button' value='Apply All Changes' onClick='runTrans($(\"#terms\"));return false;'></div>")
		serverRequest("GET", "/data/", {}, null, (statusCode, result, headers) ->
			asyncCallback = createAsyncQueueCallback(
				(results) -> 
					results.sort( (a, b) ->
						a[0] - b[0]
					)
					for item in results
						$("#terms").append(item[1])
				(errors) ->
					console.error(errors)
					rowCallback(idx, 'Error: ' + errors)
				(n, prod) ->
					return [n, prod]
			)
			asyncCallback.addWork(result.terms.length)
			asyncCallback.endAdding()

			# SECTION: Top level resources
			for term, i in result.terms
				term = result.terms[i]
				pre = "<tr id='tr--data--" + term.id + "'><td>"
				
				post = "</td></tr>"
				if tree.isExpanded(term.id)
					# SECTION: Expanded resource
					expandedTree = tree.clone().descend(term.id)
					npos = expandedTree.getNewURI("del")
					pre += "<div style='display:inline; background-color:#FFFFFF;'>" + term.name + "</div>"
					pre += "<div style='display:inline;background-color:#FFFFFF'><a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>"

					# request schema from server and store locally.
					do (i, pre, post) ->
						# TODO: We shouldn't really be requesting/using the SQL model on client side
						serverRequest("GET", "/lfmodel/", {}, null, (statusCode, result) ->
							uid = new uidraw(i, asyncCallback.successCallback, pre, post, rootURI, true, expandedTree, result)
							uid.subRowIn()
						)
				else
					newb = [ 'collection', [ term.id ], [ "mod" ] ]
					npos = tree.getNewURI("add", newb)
					pre += term.name
					pre += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>"
					asyncCallback.successCallback(i, pre + post)
		)

	uidraw = (idx, rowCallback, pre, post, rootURI, even, ftree, cmod) ->
		currentLocation = ftree.getCurrentLocation()
		about = ftree.getAbout()
		@pre = pre
		@post = post
		
		@adds = 0
		@addsout = 0
		@cols = 0
		@colsout = 0
		@type = "Term"
		@schema = []
		if even
			@bg = "#FFFFFF"
			@unbg = "#EEEEEE"
		else
			@bg = "#EEEEEE"
			@unbg = "#FFFFFF"
		
		parent = this

		asyncCallback = createAsyncQueueCallback(
			(results) -> 
				results.sort( (a, b) ->
					a[0] - b[0]
				)
				html = parent.pre
				for item in results
					html += item[1]
				html += parent.post
				rowCallback(idx, html)
			(errors) ->
				console.error(errors)
				rowCallback(idx, 'Error: ' + errors)
			(n, prod) ->
				return [n, prod]
		)

		# TODO: This needs to be given by the server rather than generated here
		getIdent = (mod) ->
			switch mod[0]
				when 'Term', 'Verb'
					mod[1].replace(new RegExp(' ', 'g'), '_')
				when 'FactType'
					ident = []
					for factTypePart in mod[1...-1]
						ident.push(getIdent(factTypePart))
					return ident.join('-')
				else
					return ''
		
		# is the thing we're talking about a term or a fact type?
		for mod in cmod[1..] when getIdent(mod) == about
			@type = mod[0]
			if @type == "FactType"
				@schema = mod[1..]

		@subRowIn = ->
			if currentLocation[0] is 'collection'
				@pre += "<div class='panel' style='background-color:" + @bg + ";'><table id='tbl--" + ftree.getPid() + "'><tbody>"
				@post += "</tbody></table></div>"

				# are there children with 'add' modifiers? huh?
				for currBranch in currentLocation when currBranch[0] == 'instance' and currBranch[1][0] == about and currBranch[1][1] == undefined
					for currBranchType in currBranch[2][1..] when currBranchType[0] == "add"
						@adds++

				# are there any subcollections?
				for mod in cmod[1..] when mod[0] == "FactType"
					for collection in mod[1..] when getIdent(collection) == about
						@cols++

				targ = serverAPI(about)
				serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
					resl = ""
					rows = result.instances.length
					asyncCallback.addWork(rows + 2 + parent.adds + 1 + parent.cols)
					asyncCallback.endAdding()
					# get link which adds an 'add inst' dialog.
					npos = ftree.getChangeURI('add', about)
					asyncCallback.successCallback(rows + 1, "<tr><td><a href = '" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>[(+)add new]</a></td></tr>")

					# render each child and call back
					for instance, i in result.instances
						do(instance, i) ->
							processInstance = () ->
								isExpanded = ftree.isExpanded(about, [instance.id, instance.value])
								action = ftree.getAction(about, [instance.id, instance.value])
											
								posl = targ + "/" + about + "*filt:id=" + instance.id
								prel = "<tr id='tr--" + ftree.getPid() + "--" + instance.id + "'><td>"
								if isExpanded
									expandedTree = ftree.clone().descend(about, [instance.id, instance.value])
									prel += "<div style='display:inline;background-color:" + parent.unbg + "'>"
								if parent.type == "Term"
									prel += instance.value
								else if parent.type == "FactType"
									for schema in parent.schema
										if schema[0] == "Term"
											prel += instance[schema[1]].value + " "
										else if schema[0] == "Verb"
											prel += "<em>" + schema[1] + "</em> "

								if isExpanded
									prel += "</div>"

								if !isExpanded
									npos = ftree.getChangeURI('view', about, instance.id)
									prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>"
								else if action == "view"
									npos = expandedTree.getNewURI("del")
									prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>"

								if !isExpanded
									npos = ftree.getChangeURI('edit', about, instance.id)
									prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>"
								else if action == "edit"
									npos = expandedTree.getNewURI("del")
									prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>"

								if !isExpanded
									npos = ftree.getChangeURI('del', about, instance.id)
									prel += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Delete' class='ui-icon ui-icon-trash'></span></a>"
								else if action == "del"
									npos = expandedTree.getNewURI("del")
									prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>"

								postl = "</td></tr>"
								if isExpanded
									uid = new uidraw(i, asyncCallback.successCallback, prel, postl, rootURI, not even, expandedTree, cmod)
									uid.subRowIn()
								else
									asyncCallback.successCallback(i, prel + postl)
							if parent.type == "FactType"
								getResolvedFactType(parent.schema, instance,
									(factTypeInstance) -> 
										instance = factTypeInstance
										processInstance()
									(errors) ->
										console.error(errors)
										asyncCallback.successCallback(i, 'Errors: ' + errors)
								)
							else
								processInstance()

					asyncCallback.successCallback(rows, "<tr><td><hr style='border:0px; width:90%; background-color: #999; height:1px;'></td></tr>")
					# launch more uids to render the adds
					posl = targ + "/" + about

					for currBranch, j in currentLocation[3..]
						if currBranch[0] == 'instance' and currBranch[1][0] == about and currBranch[1][1] == undefined
							for currBranchType in currBranch[2] when currBranchType[0] == "add"
								newTree = ftree.clone().descendByIndex(j + 3)
								uid = new uidraw(rows + 1 + ++parent.addsout, asyncCallback.successCallback, "<tr><td>", "</td></tr>", rootURI, not even, newTree, cmod)
								uid.subRowIn()
								break

					asyncCallback.successCallback(rows + 1 + parent.adds + 1, "<tr><td><hr style='border:0px; width:90%; background-color: #999; height:1px;'></td></tr>")

					# launch a final callback to add the subcollections.
					for mod in cmod[1..] when mod[0] == "FactType"
						for termVerb in mod[1..] when termVerb[1] == about
							resourceName = getIdent(mod)

							parent.colsout++
							res = ""
							pre = "<tr id='tr--data--" + resourceName + "'><td>"
							post = "</td></tr>"
							if ftree.isExpanded(resourceName)
								expandedTree = ftree.clone().descend(resourceName)
								npos = expandedTree.getNewURI("del")
								pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + resourceName + "</div>"
								pre += "<div style='display:inline;background-color:" + parent.unbg + "'><a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>"
								uid = new uidraw(rows + 1 + parent.adds + 1 + parent.colsout, asyncCallback.successCallback, pre, post, rootURI, not even, expandedTree, cmod)
								uid.subRowIn()
							else
								newb = [ 'collection', [ resourceName ], [ "mod" ] ]
								npos = ftree.getNewURI("add", newb)
								pre += resourceName
								pre += " <a href='" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>"
								res += (pre + post)
								asyncCallback.successCallback(rows + 1 + parent.adds + 1 + parent.colsout, res)
				)
			else if currentLocation[0] == 'instance'
				asyncCallback.addWork(1)
				asyncCallback.endAdding()
				@pre += "<div class='panel' style='background-color:" + @bg + ";'>"
				@post += "</div>"
				# backURI = serverAPI(about)
				backURI = ftree.getNewURI('del')
				@id = currentLocation[1][1]
				actn = "view"

				# find first action.
				for branchType in currentLocation[2][1..] when branchType[0] in ["add", "edit", "del"]
					actn = branchType[0]
					break

				switch actn
					when "view"
						if @type == "Term"
							targ = serverAPI(about)
							serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
								res = ""
								for item of result.instances[0] when item != "__clone"
									res += item + ": " + result.instances[0][item] + "<br/>"
								asyncCallback.successCallback(1, res)
							)
						else if @type == "FactType"
							targ = serverAPI(about)
							serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
								res = "id: " + result.instances[0].id + "<br/>"
								getResolvedFactType(parent.schema, result.instances[0],
									(factTypeInstance) -> 
										for schema in parent.schema
											if schema[0] == "Term"
												res += factTypeInstance[schema[1]].value + " "
											else if schema[0] == "Verb"
												res += schema[1] + " "
										asyncCallback.successCallback(1, res)
									(errors) ->
										console.error(errors)
										asyncCallback.successCallback(1, 'Errors: ' + errors)
								)
								
							)
					when "add"
						if @type == "Term"
							# TODO: The schema info should come from cmod
							schema = [['Text', 'value', 'Name', []]]

							# print form.
							res = "<div align='right'>"
							res += "<form class='action'>"
							templateVars =
								action: 'addterm'
								serverURI: serverAPI(about)
								backURI: backURI
								type: about
							res += createHiddenInputs(templateVars)
							console.log "addterm backURI=" + backURI

							for currSchema in schema
								switch currSchema[0]
									when "Text"
										res += currSchema[2] + ": " + widgets.inputText(currSchema[1]) + "<br />"
									when "ForeignKey"
										alert currSchema
							res += "<input type='submit' value='Submit This' onClick='processForm(this.parentNode);return false;'>"
							res += "</form>"
							res += "</div>"
							asyncCallback.successCallback(1, res)
						else if @type == "FactType"
							getTermResults(parent.schema, (termResults) ->
								res = createFactTypeForm(parent.schema, termResults, 'addfctp', serverAPI(about), backURI, about)
								asyncCallback.successCallback(1, res)
							)
					when "edit"
						if @type == "Term"
							# TODO: The schema info should come from cmod
							schema = [['Text', 'value', 'Name', []]]

							targ = serverAPI(about)
							serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
								id = result.instances[0].id
								res = "<div align='left'>"
								res += "<form class='action'>"
								templateVars =
									action: 'editterm'
									serverURI: serverAPI(about, [['id', '=', id]])
									backURI: serverAPI(about)
									type: about
									id: id
								res += createHiddenInputs(templateVars)
								res += "id: " + id + "<br/>"

								for currSchema in schema
									switch currSchema[0]
										when "Text"
											res += currSchema[2] + ": " + widgets.inputText(currSchema[1], result.instances[0][currSchema[1]]) + "<br />"
										when "ForeignKey"
											console.log currSchema
								res += "<div align='right'>"
								res += "<input type='submit' value='Submit This' onClick='processForm(this.parentNode.parentNode);return false;'>"
								res += "</div>"
								res += "</form>"
								res += "</div>"
								asyncCallback.successCallback(1, res)
							)
						else if @type == "FactType"
							targ = ftree.getServerURI()
							serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
								getResolvedFactType(parent.schema, result.instances[0],
									(factTypeInstance) ->
										getTermResults(parent.schema, (termResults) ->
											res = "<div align='left'>"
											res += createFactTypeForm(parent.schema, termResults, 'editfctp', serverAPI(about) + "*filt:id=" + factTypeInstance.id, serverAPI(about), about, factTypeInstance)
											res += "</div>"
											asyncCallback.successCallback(1, res)
										)
									(errors) ->
										console.error(errors)
										asyncCallback.successCallback(1, 'Errors: ' + errors)
								)
							)
					when "del"
						# TODO: make this a function
						templateVars =
							action: 'del'
							serverURI: serverAPI(about, [['id', '=', @id]])
							backURI: serverAPI(about)
							type: about
							id: @id
						res =
							"<div align='left'>" +
								"marked for deletion" +
								"<div align='right'>" +
									"<form class='action'>" +
										createHiddenInputs(templateVars) +
										"<input type='submit' value='Confirm' onClick='processForm(this.parentNode.parentNode);return false;'>" +
									"</form>" +
								"</div>" +
							"</div>"
						asyncCallback.successCallback(1, res)
		return this

	createFactTypeForm = (schemas, termResults, action, serverURI, backURI, type, currentFactType = false) ->
		termSelects = {}
		for termName, termResult of termResults
			select = "<select id='" + termName + "'>"
			# Loop through options
			for term in termResult
				select += "<option value='" + term.id + "'"
				# if current value, print selected
				if currentFactType != false and currentFactType[termName].id == term.id
					select += " selected='selected'" 
				select += ">" + term.value + "</option>"
			select += "</select>"
			termSelects[termName] = select

		res = "<form class='action'>"
		templateVars =
			action: action
			serverURI: serverURI
			backURI: backURI
			type: type
			id: if currentFactType == false then false else currentFactType.id
		res += createHiddenInputs(templateVars)

		# merge dropdowns with verbs to create 'form'
		for schema in schemas
			if schema[0] == "Term"
				res += termSelects[schema[1]] + " "
			else if schema[0] == "Verb"
				res += schema[1] + " "
		#add submit button etc.
		res += "<div align='right'>"
		res += "<input type='submit' value='Submit This' onClick='processForm(this.parentNode.parentNode);return false;'>"
		res += "</div>"
		res += "</form>"
		return res

	processForm = (forma) ->
		action = $("#__actype", forma).val()
		serverURI = $("#__serverURI", forma).val()
		id = $("#__id", forma).val()
		type = $("#__type", forma).val()
		backURI = $("#__backURI", forma).val()
		# TODO: id and type (and half of actype) are not yet used.
		# Should they be used instead of serverURI?
		switch action
			when "editterm", "editfctp"
				editInst(forma, serverURI, backURI)
			when "addterm", "addfctp"
				addInst(forma, serverURI, backURI)
			when "del"
				delInst(forma, serverURI, backURI)

	delInst = (forma, uri, backURI) ->
		@backURI = backURI
		serverRequest "DELETE", uri, {}, null, (statusCode, result, headers) ->
			location.hash = "#!" + backURI

		false

	editInst = (forma, serverURI, backURI) ->
		@backURI = backURI
		inputs = $(":input:not(:submit)", forma)
		obj = $.map(inputs, (n, i) ->
			unless n.id.slice(0, 2) == "__"
				o = {}
				o[n.id] = $(n).val()
				o
		)
		serverRequest "PUT", serverURI, {}, obj, (statusCode, result, headers) ->
			location.hash = "#!" + backURI

		false

	addInst = (forma, uri, backURI) ->
		@backURI = backURI
		inputs = $(":input:not(:submit)", forma)
		obj = $.map(inputs, (n, i) ->
			unless n.id.slice(0, 2) == "__"
				o = {}
				o[n.id] = $(n).val()
				o
		)
		serverRequest "POST", uri, {}, obj, (statusCode, result, headers) ->
			location.hash = "#!" + backURI

		false


	window.drawData = drawData
	window.processForm = processForm
)
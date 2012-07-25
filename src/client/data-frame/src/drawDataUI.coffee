define(['data-frame/ClientURIUnparser', 'utils/createAsyncQueueCallback', 'ejs'], (ClientURIUnparser, createAsyncQueueCallback, ejs) ->
	templates = {
		widgets: {}
		hiddenFormInput: ejs.compile('''
			<input type="hidden" id="__actype" value="<%= action %>">
			<input type="hidden" id="__serverURI" value="<%= serverURI %>">
			<input type="hidden" id="__backURI" value="<%= backURI %>">
			<input type="hidden" id="__type" value="<%= type %>"><%
			if(id !== false) { %>
				<input type="hidden" id="__id" value="<%= id %>"><%
			} %>
			''')
		factTypeForm: ejs.compile('''
			<div class="panel" style="background-color:<%= backgroundColour %>;">
				<form class="action">
					<%- templates.hiddenFormInput(locals) %><%
					for(var i = 0; i < factType.length; i++) {
						var factTypePart = factType[i];
						switch(factTypePart[0]) {
							case "Term":
								var termName = factTypePart[1],
									termResult = termResults[termName]; %>
								<select id="<%= termName %>"><%
									for(var j = 0; j < termResult.length; j++) {
										var term = termResult[j]; %>
										<option value="<%= term.id %>"<%
											if(currentFactType !== false && currentFactType[termName].id == term.id) { %>
												selected="selected" <%
											} %>
										>
											<%= term.value %>
										</option><%
									} %>
								</select><%
							break;
							case "Verb":
								%><%= factTypePart[1] %><%
							break;
						}
					} %>
					<div align="right">
						<input type="submit" value="Submit This" onClick="processForm(this.parentNode.parentNode);return false;">
					</div>
				</form>
			</div>
			''')
		termForm: ejs.compile('''
			<div class="panel" style="background-color:<%= backgroundColour %>;">
				<div align="left">
					<form class="action">
						<%- templates.hiddenFormInput(locals) %><%
						if(id !== false) { %>
							id: <%= id %><br/><%
						}

						for(var i = 0; i < termFields.length; i++) {
							var termField = termFields[i]; %>
							<%= termField[2] %>: <%
							switch(termField[0]) {
								case "Text": %>
									<%- templates.widgets.inputText(termField[1], term === false ? "" : term[termField[1]]) %><%
								break;
								case "ForeignKey":
									console.error("Hit FK", termField);
								break;
								default:
									console.error("Hit default, wtf?");
							} %>
							<br /><%
						} %>
						<div align="right">
							<input type="submit" value="Submit This" onClick="processForm(this.parentNode.parentNode);return false;">
						</div>
					</form>
				</div>
			</div>
			''')
		deleteForm: ejs.compile('''
			<div class="panel" style="background-color:<%= backgroundColour %>;">
				<div align="left">
					marked for deletion
					<div align="right">
						<form class="action">
							<%- templates.hiddenFormInput(locals) %>
							<input type="submit" value="Confirm" onClick="processForm(this.parentNode.parentNode);return false;">
						</form>
					</div>
				</div>
			</div>
			''')
		factTypeCollection: ejs.compile('''
			<%
			for(var i = 0; i < factTypeCollections.length; i++) {
				var factTypeCollection = factTypeCollections[i]; %>
				<tr id="tr--data--<%= factTypeCollection.resourceName %>">
					<td><%
						if(factTypeCollection.isExpanded) { %>
							<div style="display:inline;background-color:"<%= altBackgroundColour %>"><%= factTypeCollection.resourceName %></div>
							<div style="display:inline;background-color:"<%= altBackgroundColour %>">
								<a href="<%= factTypeCollection.closeURI %>" onClick="location.hash='<%= factTypeCollection.closeHash %>';return false">
									<span title="Close" class="ui-icon ui-icon-circle-close"></span>
								</a>
							</div>
							<%- factTypeCollection.html %><%
						}
						else { %>
							<%= factTypeCollection.resourceName %>
							<a href="<%= factTypeCollection.expandURI %>" onClick="location.hash='<%= factTypeCollection.expandHash %>';return false">
								<span title="See all" class="ui-icon ui-icon-search"></span>
							</a><%
						} %>
					</td>
				</tr><%
			} %>
			''')
		resourceCollection: ejs.compile('''
			<div class="panel" style="background-color:<%= backgroundColour %>;">
				<table id="tbl--<%= pid %>">
					<tbody><%
						for(var i = 0; i < resourceCollections.length; i++) {
							var resourceCollection = resourceCollections[i]; %>
							<tr id="tr--<%= pid %>--<%= resourceCollection.id %>">
								<td><%
									if(resourceCollection.isExpanded) { %>
										<div style="display:inline;background-color:<%= altBackgroundColour %>">
											<%- resourceCollection.resourceName %>
											<a href="<%= resourceCollection.closeURI %>" onClick="location.hash='<%= resourceCollection.closeHash %>';return false"><%
												switch(resourceCollection.action) {
													case "view":
													case "edit":
														%><span title="Close" class="ui-icon ui-icon-circle-close"></span><%
													break;
													case "del":
														%>[unmark]<%
												} %>
											</a>
										</div>
										<%- resourceCollection.html %><%
									}
									else { %>
										<%- resourceCollection.resourceName %>
										<a href="<%= resourceCollection.viewURI %>" onClick="location.hash='<%= resourceCollection.viewHash %>';return false">
											<span title="View" class="ui-icon ui-icon-search"></span>
										</a>
										<a href="<%= resourceCollection.editURI %>" onClick="location.hash='<%= resourceCollection.editHash %>';return false">
											<span title="Edit" class="ui-icon ui-icon-pencil"></span>
										</a>
										<a href="<%= resourceCollection.deleteURI %>" onClick="location.hash='<%= resourceCollection.deleteHash %>';return false">
											<span title="Delete" class="ui-icon ui-icon-trash"></span>
										</a><%
									} %>
								</td>
							</tr><%
						} %>
						<tr>
							<td>
								<hr style="border:0px; width:90%; background-color: #999; height:1px;">
							</td>
						</tr>
						<tr>
							<td>
								<a href="<%= addURI %>" onClick="location.hash='<%= addHash %>';return false;">[(+)add new]</a>
							</td>
						</tr>
						<%- addsHTML %>
						<tr>
							<td>
								<hr style="border:0px; width:90%; background-color: #999; height:1px;">
							</td>
						</tr>
						<%- templates.factTypeCollection(locals) %>
					</tbody>
				</table>
			</div>
			''')
		termView: ejs.compile('''
			<div class="panel" style="background-color:<%= backgroundColour %>;"><%
				for(var field in termInstance) { %>
					<%= termInstance %>: <%= termInstance[field] %><br/><%
				} %>
			</div>
			''')
		factTypeView: ejs.compile('''
			<div class="panel" style="background-color:<%= backgroundColour %>;">
				id: <%= factTypeInstance.id %><br/><%
				for(var i = 0; i < factType.length; i++) {
					var factTypePart = factType[i];
					if(factTypePart[0] == "Term") { %>
						<%= factTypeInstance[factTypePart[1]].value %> <%
					}
					else if(factTypePart[0] == "Verb") { %>
						<%= factTypePart[1] %><%
					}
				} %>
			</div>
			''')
		topLevelTemplate: ejs.compile('''
			<table id="terms">
				<tbody><%
					for(var i = 0; i < terms.length; i++) {
						var term = terms[i]; %>
						<tr id="tr--data--"<%= term.id %>">
							<td><%
								if(term.isExpanded) { %>
									<div style="display:inline; background-color:#FFFFFF;">
										<%= term.name %>
										<a href="<%= term.closeURI %>" onClick="location.hash='<%= term.closeHash %>';return false">
											<span title="Close" class="ui-icon ui-icon-circle-close"></span>
										</a>
									</div>
									<%- term.html %><%
								}
								else { %>
									<%= term.name %>
									<a href="<%= term.expandURI %>" onClick="location.hash='<%= term.expandHash %>';return false">
										<span title="See all" class="ui-icon ui-icon-search"></span>
									</a><%
								} %>
							</td>
						</tr><%
					} %>
				</tbody>
			</table><br/>
			<div align="left">
				<input type="button" value="Apply All Changes" onClick="runTrans($('#terms'));return false;">
			</div>
			''')
	}
	requirejs(['data-frame/widgets/inputText'], (inputText) ->
		templates.widgets.inputText = inputText
	)
	
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
		factTypeInstance = $.extend(true, {}, factTypeInstance)
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
		serverRequest("GET", "/data/", {}, null, (statusCode, result, headers) ->
			asyncCallback = createAsyncQueueCallback(
				(results) ->
					templateVars =
						terms: result.terms
						templates: templates
					res = templates.topLevelTemplate(templateVars)
					$("#dataTab").html(res)
				null
				(i, html) ->
					if i != false
						result.terms[i].html = html
					return null
			)
			asyncCallback.addWork(result.terms.length)
			asyncCallback.endAdding()

			# SECTION: Top level resources
			for term, i in result.terms
				term = result.terms[i]
				term.isExpanded = tree.isExpanded(term.id)
				if term.isExpanded
					# SECTION: Expanded resource
					expandedTree = tree.clone().descend(term.id)
					term.deleteHash = '#!/' + expandedTree.getNewURI("del")
					term.deleteURI = rootURI + term.deleteHash
					# request schema from server and store locally.
					do (i) ->
						serverRequest("GET", "/lfmodel/", {}, null, (statusCode, result) ->
							uid = new uidraw(i, asyncCallback.successCallback, '', '', rootURI, true, expandedTree, result)
							uid.subRowIn()
						)
				else
					newb = [ 'collection', [ term.id ], [ "mod" ] ]
					term.expandHash = '#!/' + tree.getNewURI("add", newb)
					term.expandURI = rootURI + term.deleteHash
					asyncCallback.successCallback(false)
		)

	uidraw = (idx, rowCallback, pre, post, rootURI, even, ftree, cmod) ->
		currentLocation = ftree.getCurrentLocation()
		about = ftree.getAbout()
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
				html = pre
				for item in results
					html += item[1]
				html += post
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
					asyncCallback.addWork(1)
					asyncCallback.endAdding()
					resourceCollections = []
					resourceCollectionsCallback = createAsyncQueueCallback(
						() ->
							addHash = '!#/' + ftree.getChangeURI('add', about)
							templateVars =
								pid: ftree.getPid()
								addHash: addHash
								addURI: rootURI + addHash
								addsHTML: addsHTML
								factTypeCollections: factTypeCollections
								resourceCollections: resourceCollections
								backgroundColour: parent.bg
								altBackgroundColour: parent.unbg
								templates: templates
							res = templates.resourceCollection(templateVars)
							asyncCallback.successCallback(0, res)
						(errors) ->
							console.error(errors)
							asyncCallback.successCallback('Resource Collections Errors: ' + errors)
						(index, html, isResourceName) ->
							if index != false
								resourceCollections[index].html = html
							return null
					)
					# render each child and call back
					for instance, i in result.instances
						do(instance, i) ->
							resourceCollections[i] =
								isExpanded: ftree.isExpanded(about, [instance.id, instance.value])
								action: ftree.getAction(about, [instance.id, instance.value])
								id: instance.id
							
							if parent.type == "Term"
								resourceCollections[i].resourceName = instance.value
							else if parent.type == "FactType"
								resourceCollectionsCallback.addWork(1)
								getResolvedFactType(parent.schema, instance,
									(factTypeInstance) -> 
										resourceName = ''
										for schema in parent.schema
											if schema[0] == "Term"
												resourceName += factTypeInstance[schema[1]].value + " "
											else if schema[0] == "Verb"
												resourceName += "<em>" + schema[1] + "</em> "
										resourceCollections[i].resourceName = resourceName
										resourceCollectionsCallback.successCallback(false)
									(errors) ->
										console.error(errors)
										resourceCollectionsCallback.errorCallback(i, 'Errors: ' + errors, true)
								)
							
							if resourceCollections[i].isExpanded
								expandedTree = ftree.clone().descend(about, [instance.id, instance.value])
								resourceCollections[i].closeHash = '#!/' + expandedTree.getNewURI("del")
								resourceCollections[i].closeURI = rootURI + resourceCollections[i].deleteHash
								resourceCollectionsCallback.addWork(1)
								uid = new uidraw(i, resourceCollectionsCallback.successCallback, '', '', rootURI, not even, expandedTree, cmod)
								uid.subRowIn()
							else
								resourceCollections[i].viewHash = '#!/' + ftree.getChangeURI('view', about, instance.id)
								resourceCollections[i].viewURI = rootURI + resourceCollections[i].viewHash
								resourceCollections[i].editHash = '#!/' + ftree.getChangeURI('edit', about, instance.id)
								resourceCollections[i].editURI = rootURI + resourceCollections[i].editHash
								resourceCollections[i].deleteHash = '#!/' + ftree.getChangeURI('del', about, instance.id)
								resourceCollections[i].deleteURI = rootURI + resourceCollections[i].deleteHash
					
					addsHTML = ''
					resourceCollectionsCallback.addWork(1)
					addsCallback = createAsyncQueueCallback(
						(results) ->
							results.sort( (a, b) ->
								a[0] - b[0]
							)
							for item in results
								addsHTML += item[1]
							resourceCollectionsCallback.successCallback(false)
						(errors) ->
							console.error(errors)
							resourceCollectionsCallback.errorCallback('Adds Errors: ' + errors)
						(n, prod) ->
							return [n, prod]
					)
					for currBranch, j in currentLocation[3..]
						if currBranch[0] == 'instance' and currBranch[1][0] == about and currBranch[1][1] == undefined
							for currBranchType in currBranch[2] when currBranchType[0] == "add"
								newTree = ftree.clone().descendByIndex(j + 3)
								addsCallback.addWork(1)
								uid = new uidraw(++parent.addsout, addsCallback.successCallback, "<tr><td>", "</td></tr>", rootURI, not even, newTree, cmod)
								uid.subRowIn()
								break
					addsCallback.endAdding()

					factTypeCollections = []
					resourceCollectionsCallback.addWork(1)
					factTypeCollectionsCallback = createAsyncQueueCallback(
						() ->
							resourceCollectionsCallback.successCallback(false)
						(errors) ->
							console.error(errors)
							resourceCollectionsCallback.errorCallback('Fact Type Collection Errors: ' + errors)
						(index, html) ->
							factTypeCollections[index].html = html
							return null
					)
					i = 0
					# launch a final callback to add the subcollections.
					for mod in cmod[1..] when mod[0] == "FactType"
						for termVerb in mod[1..] when termVerb[1] == about
							resourceName = getIdent(mod)
							factTypeCollections[i] = {
								resourceName: resourceName
								isExpanded: ftree.isExpanded(resourceName)
							}
							if factTypeCollections[i].isExpanded
								expandedTree = ftree.clone().descend(resourceName)
								factTypeCollections[i].closeHash = '#!/' + expandedTree.getNewURI("del")
								factTypeCollections[i].closeURI = rootURI + factTypeCollections[i].closeHash
								factTypeCollectionsCallback.addWork(1)
								uid = new uidraw(i, factTypeCollectionsCallback.successCallback, '', '', rootURI, not even, expandedTree, cmod)
								uid.subRowIn()
							else
								newb = [ 'collection', [ resourceName ], [ "mod" ] ]
								factTypeCollections[i].expandHash = '#!/' + ftree.getNewURI("add", newb)
								factTypeCollections[i].expandURI = rootURI + factTypeCollections[i].expandHash
							i++
					factTypeCollectionsCallback.endAdding()
					resourceCollectionsCallback.endAdding()
				)
			else if currentLocation[0] == 'instance'
				asyncCallback.addWork(1)
				asyncCallback.endAdding()
				# backURI = serverAPI(about)
				backURI = ftree.getNewURI('del')
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
								templateVars =
									termInstance: result.instances[0]
									backgroundColour: parent.bg
									altBackgroundColour: parent.unbg
									templates: templates
								res = templates.termView(templateVars)
								asyncCallback.successCallback(1, res)
							)
						else if @type == "FactType"
							targ = ftree.getServerURI()
							serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
								getResolvedFactType(parent.schema, result.instances[0],
									(factTypeInstance) -> 
										templateVars =
											factType: parent.schema
											factTypeInstance: factTypeInstance
											backgroundColour: parent.bg
											altBackgroundColour: parent.unbg
											templates: templates
										res = templates.factTypeView(templateVars)
										asyncCallback.successCallback(1, res)
									(errors) ->
										console.error(errors)
										asyncCallback.successCallback(1, 'Errors: ' + errors)
								)
								
							)
					when "add"
						if @type == "Term"
							# TODO: The termFields info should come from a client model
							termFields = [['Text', 'value', 'Name', []]]
							templateVars =
								action: 'addterm'
								serverURI: serverAPI(about)
								backURI: backURI
								type: about
								id: false
								term: false
								termFields: termFields
								backgroundColour: @bg
								altBackgroundColour: @unbg
								templates: templates
							res = templates.termForm(templateVars)
							asyncCallback.successCallback(1, res)
						else if @type == "FactType"
							getTermResults(parent.schema, (termResults) ->
								templateVars =
									factType: parent.schema
									termResults: termResults
									action: 'addfctp'
									serverURI: serverAPI(about)
									backURI: backURI
									type: about
									currentFactType: false
									id: false
									backgroundColour: parent.bg
									altBackgroundColour: parent.unbg
									templates: templates
								res = templates.factTypeForm(templateVars)
								asyncCallback.successCallback(1, res)
							)
					when "edit"
						if @type == "Term"
							# TODO: The termFields info should come from a client model
							termFields = [['Text', 'value', 'Name', []]]

							targ = serverAPI(about)
							serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
								id = result.instances[0].id
								templateVars =
									action: 'editterm'
									serverURI: serverAPI(about, [['id', '=', id]])
									backURI: serverAPI(about)
									type: about
									id: id
									term: result.instances[0]
									termFields: termFields
									backgroundColour: parent.bg
									altBackgroundColour: parent.unbg
									templates: templates
								res = templates.termForm(templateVars)
								asyncCallback.successCallback(1, res)
							)
						else if @type == "FactType"
							targ = ftree.getServerURI()
							serverRequest("GET", targ, {}, null, (statusCode, result, headers) ->
								getResolvedFactType(parent.schema, result.instances[0],
									(factTypeInstance) ->
										getTermResults(parent.schema, (termResults) ->
											templateVars =
												factType: parent.schema
												termResults: termResults
												action: 'editfctp'
												serverURI: serverAPI(about, [['id', '=', factTypeInstance.id]])
												backURI: serverAPI(about)
												type: about
												currentFactType: factTypeInstance
												id: factTypeInstance.id
												backgroundColour: parent.bg
												altBackgroundColour: parent.unbg
												templates: templates
											res = templates.factTypeForm(templateVars)
											asyncCallback.successCallback(1, res)
										)
									(errors) ->
										console.error(errors)
										asyncCallback.successCallback(1, 'Errors: ' + errors)
								)
							)
					when "del"
						templateVars =
							action: 'del'
							serverURI: serverAPI(about, [['id', '=', @id]])
							backURI: serverAPI(about)
							type: about
							id: currentLocation[1][1]
							backgroundColour: @bg
							altBackgroundColour: @unbg
							templates: templates 
						res = templates.deleteForm(templateVars)
						asyncCallback.successCallback(1, res)
		return this

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
define(['data-frame/ClientURIUnparser', 'utils/createAsyncQueueCallback', 'ejs', 'data-frame/widgets'], (ClientURIUnparser, createAsyncQueueCallback, ejs, widgets) ->
	templates = {
		widgets: widgets
		hiddenFormInput: ejs.compile('''
			<input type="hidden" id="__actype" value="<%= action %>">
			<input type="hidden" id="__type" value="<%= resourceModel.resourceName %>">
			<input type="hidden" id="__serverURI" value="<%= serverURI %>">
			<input type="hidden" id="__backURI" value="<%= backURI %>"><%
			if(id !== false) { %>
				<input type="hidden" id="__id" value="<%= id %>"><%
			} %>
			''')
		dataTypeDisplay: ejs.compile('''
			<%
			var fieldName = resourceField[1],
				fieldValue = resourceInstance === false ? "" : resourceInstance[fieldName],
				fieldIdentifier = resourceModel.resourceName + "." + fieldName; %>
			<%= fieldName %>: <%- templates.widgets(resourceField[0], action, fieldIdentifier, fieldValue, foreignKeys[fieldName]) %><br />
			''')
		viewAddEditResource: ejs.compile('''
			<div class="panel" style="background-color:<%= backgroundColour %>;">
				<form class="action">
					<%- templates.hiddenFormInput(locals) %><%
					for(var i = 0; i < resourceModel.fields.length; i++) { %>
						<%-
							templates.dataTypeDisplay({
								templates: templates,
								resourceInstance: resourceInstance,
								resourceModel: resourceModel,
								resourceField: resourceModel.fields[i],
								foreignKeys: foreignKeys,
								action: action
							})
						%><%
					}
					if(action !== "view") { %>
						<div align="right">
							<input type="submit" value="Submit This" onClick="processForm(this.parentNode.parentNode);return false;">
						</div><%
					} %>
				</form>
			</div>
			''')
		deleteResource: ejs.compile('''
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
							<div style="display:inline;background-color:<%= altBackgroundColour %>">
								<%= factTypeCollection.resourceName.replace(/[_-]/g, ' ') %>
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
										<%- resourceCollection.resourceName %><%
										if(resourceModel.actions.indexOf("view") !== -1) { %>
											<a href="<%= resourceCollection.viewURI %>" onClick="location.hash='<%= resourceCollection.viewHash %>';return false"><span title="View" class="ui-icon ui-icon-search"></span></a><%
										}
										if(resourceModel.actions.indexOf("edit") !== -1) { %>
											<a href="<%= resourceCollection.editURI %>" onClick="location.hash='<%= resourceCollection.editHash %>';return false"><span title="Edit" class="ui-icon ui-icon-pencil"></span></a><%
										}
										if(resourceModel.actions.indexOf("delete") !== -1) { %>
											<a href="<%= resourceCollection.deleteURI %>" onClick="location.hash='<%= resourceCollection.deleteHash %>';return false"><span title="Delete" class="ui-icon ui-icon-trash"></span></a><%
										}
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
						</tr><%
						for(var i = 0; i < addsHTML.length; i++) { %>
							<tr>
								<td>
									<%- addsHTML[i] %>
								</td>
							</tr><%
						} %>
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
		factTypeName: ejs.compile('''
				<%
				for(var i = 0; i < factType.length; i++) {
					var factTypePart = factType[i];
					if(factTypePart[0] == "Term") { %>
						<%= foreignKeys[factTypePart[1]][instance[factTypePart[1]]].value %> <%
					}
					else if(factTypePart[0] == "Verb") { %>
						<em><%= factTypePart[1] %></em><%
					}
				} %>
				''')
		topLevelTemplate: ejs.compile('''
			<table id="terms">
				<tbody><%
					for(var resourceName in topLevelResources) {
						if(!topLevelResources.hasOwnProperty(resourceName)) {
							continue;
						}
						var resource = topLevelResources[resourceName]; %>
						<tr id="tr--data--"<%= resourceName %>">
							<td><%
								if(resource.isExpanded) { %>
									<div style="display:inline; background-color:#FFFFFF;">
										<%= resourceName %>
										<a href="<%= resource.closeURI %>" onClick="location.hash='<%= resource.closeHash %>';return false">
											<span title="Close" class="ui-icon ui-icon-circle-close"></span>
										</a>
									</div>
									<%- resource.html %><%
								}
								else { %>
									<%= resourceName %>
									<a href="<%= resource.expandURI %>" onClick="location.hash='<%= resource.expandHash %>';return false">
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
	baseTemplateVars =
		templates: templates
	evenTemplateVars =
		backgroundColour: '#FFFFFF'
		altBackgroundColour: '#EEEEEE'
	oddTemplateVars =
		backgroundColour: '#EEEEEE'
		altBackgroundColour: '#FFFFFF'
	
	createNavigableTree = (tree, descendTree = []) ->
		tree = jQuery.extend(true, [], tree)
		descendTree = jQuery.extend(true, [], descendTree)
		
		previousLocations = []
		currentLocation = tree

		getIndexForResource = (resourceName, resourceID) ->
			for leaf, j in currentLocation when leaf[0] in ['collection', 'instance'] and leaf[1]?[0] == resourceName and (
					!resourceID? or (leaf[1][1] != undefined and leaf[1][1] == resourceID))
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
				else
					currBranch = currentLocation
				for currBranchType in currBranch[2][1..] when currBranchType[0] in ['view', 'add', 'edit', 'del']
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
			getVocabulary: () ->
				return tree[1][0]
			getModelURI: () ->
				return serverAPI(this.getVocabulary(), this.getAbout(), false)
			getServerURI: () ->
				op =
					eq: ":"
					ne: "!:"
					lk: "~"
				filters = []
				for leaf in currentLocation[2] when leaf[0] == "filt"
					leaf = leaf[1]
					if leaf[1][0] == undefined
						# The resource name - not currently used in filter
						leaf[1] = this.getAbout()
					filters.push([leaf[2], op[leaf[0]], leaf[3]])
				return serverAPI(this.getVocabulary(), this.getAbout(), filters)
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
	
	getForeignKeyResults = (tree, clientModel, successCallback) ->
		foreignKeyResults = {}
		
		asyncCallback = createAsyncQueueCallback(
			() ->
				successCallback(foreignKeyResults)
			(errors) ->
				console.error(errors)
				successCallback(foreignKeyResults)
		)

		# Get results for all the foreign keys
		for field in clientModel.fields when field[0] in ['ForeignKey', 'ConceptType']
			foreignKey = field[1]
			do(foreignKey) ->
				foreignKeyResults[foreignKey] = []
				asyncCallback.addWork(1)
				serverRequest('GET', serverAPI(tree.getVocabulary(), foreignKey), {}, null,
					(statusCode, result, headers) ->
						foreignKeys = {}
						for instance in result.instances
							foreignKeys[instance[result.model.idField]] = instance
						foreignKeyResults[foreignKey] = foreignKeys
						asyncCallback.successCallback()
					asyncCallback.errorCallback
				)
		asyncCallback.endAdding()

	serverAPI = (vocabulary, about = '', filters = []) ->
		# render filters
		if filters == false or about == ''
			filterString = ''
		else if filters.length == 0
			filterString = '?'
		else
			filterString = '?filter=' + (filter[0] + filter[1] + filter[2] for filter in filters).join(';')
		
		'/' + vocabulary + '/' + about.replace(new RegExp(' ', 'g'), '_') + filterString

	drawData = (tree) ->
		tree = createNavigableTree(tree)
		rootURI = location.pathname
		serverRequest("GET", serverAPI(tree.getVocabulary()), {}, null,
			(statusCode, clientModel, headers) ->
				topLevelResources = {}
				asyncCallback = createAsyncQueueCallback(
					(results) ->
						templateVars =
							topLevelResources: topLevelResources
							templates: templates
						res = templates.topLevelTemplate(templateVars)
						$("#dataTab").html(res)
					null
					(resourceName, html) ->
						if resourceName != false
							topLevelResources[resourceName].html = html
						return null
				)

				# SECTION: Top level resources
				for own resourceName, resource of clientModel when resource.topLevel == true
					asyncCallback.addWork(1)
					topLevelResources[resourceName] = resource
					resource.isExpanded = tree.isExpanded(resourceName)
					if resource.isExpanded
						# SECTION: Expanded resource
						expandedTree = tree.clone().descend(resourceName)
						resource.closeHash = '#!/' + expandedTree.getNewURI("del")
						resource.closeURI = rootURI + resource.closeHash
						# request schema from server and store locally.
						do (resourceName, expandedTree) ->
							serverRequest('GET', '/dev/model?filter=model_type:lf;vocabulary:data', {}, null,
								(statusCode, result) ->
									renderResource(resourceName, asyncCallback.successCallback, rootURI, true, expandedTree, result.instances[0].model_value)
								asyncCallback.errorCallback
							)
					else
						newb = [ 'collection', [ resourceName ], [ "mod" ] ]
						resource.expandHash = '#!/' + tree.getNewURI("add", newb)
						resource.expandURI = rootURI + resource.expandHash
						asyncCallback.successCallback(false)
				asyncCallback.endAdding()
			(statusCode, errors) ->
				console.error(errors)
				$("#dataTab").html('Errors: ' + errors)
		)

	renderResource = (idx, rowCallback, rootURI, even, ftree, cmod) ->
		currentLocation = ftree.getCurrentLocation()
		about = ftree.getAbout()
		resourceType = "Term"
		resourceFactType = []

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
			resourceType = mod[0]
			if resourceType == "FactType"
				resourceFactType = mod[1..]

		if currentLocation[0] is 'collection'
			serverRequest("GET", ftree.getServerURI(), {}, null,
				(statusCode, result, headers) ->
					clientModel = result.model
					resourceCollections = []
					resourceCollectionsCallback = createAsyncQueueCallback(
						() ->
							addHash = '#!/' + ftree.getChangeURI('add', about)
							templateVars = $.extend({}, baseTemplateVars, (if even then evenTemplateVars else oddTemplateVars), {
								pid: ftree.getPid()
								addHash: addHash
								addURI: rootURI + addHash
								addsHTML: addsHTML
								factTypeCollections: factTypeCollections
								resourceCollections: resourceCollections
								resourceModel: clientModel
							})
							html = templates.resourceCollection(templateVars)
							rowCallback(idx, html)
						(errors) ->
							console.error(errors)
							rowCallback(idx, 'Resource Collections Errors: ' + errors)
						(index, html, isResourceName) ->
							if index != false
								resourceCollections[index].html = html
							return null
					)
					# render each child and call back
					for instance, i in result.instances
						do(instance, i) ->
							instanceID = instance[clientModel.idField]
							resourceCollections[i] =
								isExpanded: ftree.isExpanded(about, instanceID)
								action: ftree.getAction(about, instanceID)
								id: instanceID
							
							if resourceType == "Term"
								resourceCollections[i].resourceName = instance[clientModel.valueField]
							else if resourceType == "FactType"
								resourceCollectionsCallback.addWork(1)
								getForeignKeyResults(ftree, clientModel,
									(foreignKeys) ->
										templateVars = $.extend({}, baseTemplateVars, (if even then evenTemplateVars else oddTemplateVars), {
											foreignKeys: foreignKeys
											factType: resourceFactType
											instance: instance
										})
										resourceCollections[i].resourceName = templates.factTypeName(templateVars)
										resourceCollectionsCallback.successCallback(false)
									(errors) ->
										console.error(errors)
										resourceCollectionsCallback.errorCallback(i, 'Errors: ' + errors, true)
								)
							
							if resourceCollections[i].isExpanded
								expandedTree = ftree.clone().descend(about, instanceID)
								resourceCollections[i].closeHash = '#!/' + expandedTree.getNewURI("del")
								resourceCollections[i].closeURI = rootURI + resourceCollections[i].deleteHash
								resourceCollectionsCallback.addWork(1)
								renderResource(i, resourceCollectionsCallback.successCallback, rootURI, not even, expandedTree, cmod)
							else
								resourceCollections[i].viewHash = '#!/' + ftree.getChangeURI('view', about, instanceID)
								resourceCollections[i].viewURI = rootURI + resourceCollections[i].viewHash
								resourceCollections[i].editHash = '#!/' + ftree.getChangeURI('edit', about, instanceID)
								resourceCollections[i].editURI = rootURI + resourceCollections[i].editHash
								resourceCollections[i].deleteHash = '#!/' + ftree.getChangeURI('del', about, instanceID)
								resourceCollections[i].deleteURI = rootURI + resourceCollections[i].deleteHash
					
					addsHTML = []
					resourceCollectionsCallback.addWork(1)
					addsCallback = createAsyncQueueCallback(
						(results) ->
							results.sort( (a, b) ->
								a[0] - b[0]
							)
							for item, i in results
								addsHTML[i] = item[1]
							resourceCollectionsCallback.successCallback(false)
						(errors) ->
							console.error(errors)
							resourceCollectionsCallback.errorCallback('Adds Errors: ' + errors)
						(n, prod) ->
							return [n, prod]
					)
					i = 0
					for currBranch, j in currentLocation[3..]
						if currBranch[0] == 'instance' and currBranch[1][0] == about and currBranch[1][1] == undefined
							for currBranchType in currBranch[2] when currBranchType[0] == "add"
								newTree = ftree.clone().descendByIndex(j + 3)
								addsCallback.addWork(1)
								renderResource(i++, addsCallback.successCallback, rootURI, not even, newTree, cmod)
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
								renderResource(i, factTypeCollectionsCallback.successCallback, rootURI, not even, expandedTree, cmod)
							else
								newb = [ 'collection', [ resourceName ], [ "mod" ] ]
								factTypeCollections[i].expandHash = '#!/' + ftree.getNewURI("add", newb)
								factTypeCollections[i].expandURI = rootURI + factTypeCollections[i].expandHash
							i++
					factTypeCollectionsCallback.endAdding()
					resourceCollectionsCallback.endAdding()
				(statusCode, errors) ->
					console.error(errors)
					rowCallback(idx, 'Errors: ' + errors)
			)
		else if currentLocation[0] == 'instance'
			renderInstance(ftree, even, (html) -> rowCallback(idx,html))
		
	renderInstance = (ftree, even, rowCallback) ->
		about = ftree.getAbout()
		currentLocation = ftree.getCurrentLocation()
		templateVars = $.extend({}, baseTemplateVars, (if even then evenTemplateVars else oddTemplateVars), {
			serverURI: ftree.getServerURI()
			backURI: '#!/' + ftree.getNewURI('del')
		})

		action = ftree.getAction()
		switch action
			when 'view', 'edit'
				serverRequest("GET", ftree.getServerURI(), {}, null,
					(statusCode, result, headers) ->
						clientModel = result.model
						instanceID = result.instances[0][clientModel.idField]
						getForeignKeyResults(ftree, result.model, (foreignKeys) ->
							templateVars = $.extend(templateVars, {
								action: action
								id: instanceID
								resourceInstance: result.instances[0]
								resourceModel: result.model
								foreignKeys: foreignKeys
							})
							html = templates.viewAddEditResource(templateVars)
							rowCallback(html)
						)
					(statusCode, errors) ->
						console.error(errors)
						rowCallback('Errors: ' + errors)
				)
			when 'add'
				serverRequest("GET", ftree.getModelURI(), {}, null,
					(statusCode, result, headers) ->
						getForeignKeyResults(ftree, result.model, (foreignKeys) ->
							templateVars = $.extend(templateVars, {
								action: 'add'
								id: false
								resourceInstance: false
								resourceModel: result.model
								foreignKeys: foreignKeys
							})
							html = templates.viewAddEditResource(templateVars)
							rowCallback(html)
						)
					(statusCode, errors) ->
						console.error(errors)
						rowCallback('Errors: ' + errors)
				)
			when "del"
				serverRequest("GET", ftree.getModelURI(), {}, null,
					(statusCode, result, headers) ->
						templateVars = $.extend(templateVars, {
							resourceModel: result.model
							action: 'del'
							id: currentLocation[1][1]
						})
						html = templates.deleteResource(templateVars)
						rowCallback(html)
					(statusCode, errors) ->
						console.error(errors)
						rowCallback('Errors: ' + errors)
				)

	processForm = (form) ->
		action = $("#__actype", form).val()
		serverURI = $("#__serverURI", form).val()
		id = $("#__id", form).val()
		backURI = $("#__backURI", form).val()
		# TODO: id and type (and half of actype) are not yet used.
		# Should they be used instead of serverURI?
		switch action
			when 'edit'
				submitInstance('PUT', form, serverURI, backURI)
			when 'add'
				submitInstance('POST', form, serverURI, backURI)
			when 'del'
				submitInstance('DELETE', form, serverURI, backURI)

	submitInstance = (method, form, serverURI, backURI) ->
		obj = {}
		if method != 'DELETE'
			inputs = $(":input:not(:submit)", form)
			for input in inputs when input.id[...2] != "__"
				obj[input.id] = $(input).val()
		serverRequest(method, serverURI, {}, [obj], (statusCode, result, headers) ->
			location.hash = backURI
		)
		return false


	window.drawData = drawData
	window.processForm = processForm
)
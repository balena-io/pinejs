#TODO: This should not be available client-side, this is here just to make it work for now.
requirejs([
	"mylibs/ometa-code/SBVRParser",
	"mylibs/ometa-code/SBVR_PreProc",
	"mylibs/ometa-code/SBVR2SQL"]
)

getBranch = (branch, loc) ->
	for childIndex in loc
		branch = branch[childIndex + 2]
	branch

getPid = (branch, loc) ->
	pid = branch[1][0]
	for childIndex in loc
		branch = branch[childIndex + 2]
		if branch[0] is "col"
			pid += "--" + branch[1][0]
		else
			pid += "--" + branch[1][1]
	pid

getTarg = (tree, loc, actn, newb) ->
	ptree = jQuery.extend(true, [], tree)
	#We take a reference to ptree so we can dig into it whilst still having ptree as a reference to the top level.
	parr = ptree

	for childIndex in loc
		parr = parr[childIndex + 2]

	switch actn
		when "add"
			parr.push newb
		when "del"
			parr.splice (newb + 2), 1
	#render tree into hash and return
	return ClientURIUnparser.match(ptree, "trans")

serverAPI = (about, filters) ->
	op =
		eq: "="
		ne: "!="
		lk: "~"

	flts = ""

	#render filters
	for filter in filters[1..] when about is filter[1]
		flts = flts + filter[1] + "." + filter[2] + op[filter[0]] + filter[3] + ";"

	flts = "*filt:" + flts	unless flts is ""
	"/data/" + about + flts

drawData = (tree) ->
	rootURI = location.pathname
	filters = [ "filters" ]
	$("#dataTab").html "<table id='terms'><tbody><tr><td></td></tr></tbody></table>" + "<div align='left'><br/><input type='button' value='Apply All Changes' " + " onClick='runTrans();return false;'></div>"
	serverRequest "GET", "/data/", [], "", (statusCode, result, headers) ->
		objcb =
			totsub: result.terms.length
			totend: 0
			data: []
			callback: (n, prod) ->
				@data.push [ n, prod ]
				if ++@totend == @totsub
					@data.sort (a, b) ->
						a[0] - b[0]

					i = 0

					while i < @data.length
						$("#terms").append @data[i][1]
						i++

		#if any terms have been selected
		for i in [0...result.terms.length]
			term = result.terms[i]
			launch = -1

			for j in [3...tree.length] when tree[j][1][0] == term.id
				launch = j
				break
			pre = "<tr id='tr--data--" + term.id + "'><td>"
			post = "</td></tr>"
			if launch != -1
				npos = getTarg(tree, [], "del", launch - 2)
				pre += "<div style='display:inline; background-color:#FFFFFF; " + "'>" + term.name + "</div>"
				pre += "<div style='display:inline;background-color:#FFFFFF" + "'> " + "<a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>"

				#request schema from server and store locally.
				do (i, pre, post, launch) ->
					serverRequest "GET", "/model/", [], "", (statusCode, result) ->
						#TODO: This should not be available client-side, this is here just to make it work for now.
						model = SBVRParser.matchAll(result, "expr")
						model = SBVR_PreProc.match(model, "optimizeTree")
						model = SBVR2SQL.match(model, "trans")
						uid = new uidraw(i, objcb, pre, post, rootURI, [], [], filters, [ launch - 2 ], true, tree, model)
						uid.subRowIn()
			else
				newb = [ "col", [ term.id ], [ "mod" ] ]
				npos = getTarg(tree, [], "add", newb)
				pre += term.name
				pre += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>"
				objcb.callback i, pre + post


uidraw = (idx, objcb, pre, post, rootURI, pos, pid, filters, loc, even, ftree, cmod) ->
	@idx = idx
	@objcb = objcb
	@pre = pre
	@post = post
	@rootURI = rootURI
	@pos = pos
	@loc = loc
	@even = even
	@ftree = ftree
	@branch = getBranch(@ftree, @loc)
	@filters = filters
	@filters = filtmerge(@branch, @filters)
	@pid = getPid(@ftree, @loc)
	@about = @branch[1][0]
	@data = []
	@items = 0
	@submitted = 0
	@html = ""
	@adds = 0
	@addsout = 0
	@cols = 0
	@colsout = 0
	@rows = 0
	@targ = ""
	@type = "term"
	@schema = []
	if even
		@bg = "#FFFFFF"
		@unbg = "#EEEEEE"
	else
		@bg = "#EEEEEE"
		@unbg = "#FFFFFF"

	@callback = (n, prod) ->
		@data.push [ n, prod ]
		if @data.length == @items
			@data.sort (a, b) ->
				a[0] - b[0]

			@html = @pre
			i = 0

			while i < @data.length
				@html += @data[i][1]
				i++
			@html += @post
			@objcb.callback @idx, @html

	j = 1
	#is the thing we're talking about a term or a fact type?
	while j < cmod.length
		if cmod[j][1] == @about
			@type = cmod[j][0]
			@schema = cmod[j][6]	if @type == "fcTp"
		j++

	@subRowIn = ->
		parent = this
		if @branch[0] is "col"
			@pre += "<div class='panel' style='background-color:" + @bg + ";'>" + "<table id='tbl--" + pid + "'><tbody>"
			@post += "</tbody></table></div>"
			@targ = serverAPI(@about, @filters)
			j = 3
			#are there children with 'add' modifiers? huh?
			for currBranch in @branch when currBranch[0] == "ins" and currBranch[1][0] == @about and currBranch[1][1] == undefined
				for currBranchType in currBranch[2][1..] when currBranchType[0] == "add"
					@adds++

			#are there any subcollections?
			for mod in cmod[1..] when mod[0] == "fcTp"
				for col in mod[6] when col[1] == @about
					@cols++

			serverRequest "GET", @targ, [], "", (statusCode, result, headers) ->
				resl = ""
				parent.rows = result.instances.length
				parent.items = parent.rows + 2 + parent.adds + 1 + parent.cols
				#get link which adds an 'add inst' dialog.
				newb = [ "ins", [ parent.about ], [ "mod", [ "add" ] ] ]
				npos = getTarg(parent.ftree, parent.loc, "add", newb)
				parent.data.push [ parent.rows + 1, "<tr><td><a href = '" + rootURI + "#!/" + npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>" + "[(+)add new]</a></td></tr>" ]

				#render each child and call back
				for i in [0...result.instances.length]
					instance = result.instances[i]
					launch = -1
					actn = "view"

					for j in [3...parent.branch.length]
						currBranch = parent.branch[j]
						if currBranch[0] == "ins" and currBranch[1][0] == parent.about and currBranch[1][1] != undefined and (currBranch[1][1] == instance.id or currBranch[1][1] == instance.name)
							launch = j
							#find action.
							for currBranchType in currBranch[2][1..] when currBranchType[0] in ["edit","del"]
								actn = currBranchType[0]
								break
					posl = parent.targ + "/" + parent.about + "." + instance.id
					prel = "<tr id='tr--" + pid + "--" + instance.id + "'><td>"
					prel += "<div style='display:inline;background-color:" + parent.unbg + "'>"	unless launch == -1
					if parent.type == "term"
						prel += instance.name
					else if parent.type == "fcTp"
						for schema in parent.schema
							if schema[0] == "term"
								prel += instance[schema[1] + "_name"] + " "
							else if schema[0] == "verb"
								prel += "<em>" + schema[1] + "</em> "

					prel += "</div>" unless launch == -1
					if launch != -1 and actn == "view"
						npos = getTarg(parent.ftree, parent.loc, "del", launch - 2)
						prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>"
					else if launch == -1
						newb = [ "ins", [ parent.about, instance.id ], [ "mod" ] ]
						npos = getTarg(parent.ftree, parent.loc, "add", newb)
						prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>"
					if launch != -1 and actn == "edit"
						npos = getTarg(parent.ftree, parent.loc, "del", launch - 2)
						prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>"
					else if launch == -1
						newb = [ "ins", [ parent.about, instance.id ], [ "mod", [ "edit" ] ] ]
						npos = getTarg(parent.ftree, parent.loc, "add", newb)
						prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>"
					if launch != -1 and actn == "del"
						npos = getTarg(parent.ftree, parent.loc, "del", launch - 2)
						prel += "<div style='display:inline;background-color:" + parent.unbg + "'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>"
					else if launch == -1
						newb = [ "ins", [ parent.about, instance.id ], [ "mod", [ "del" ] ] ]
						npos = getTarg(parent.ftree, parent.loc, "add", newb)
						prel += " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Delete' class='ui-icon ui-icon-trash'></span></a>"
					postl = "</td></tr>"
					if launch != -1
						locn = parent.loc.concat([ launch - 2 ])
						uid = new uidraw(i, parent, prel, postl, rootURI, [], [], parent.filters, locn, not parent.even, parent.ftree, cmod)
						uid.subRowIn()
					else
						parent.callback i, prel + postl

				parent.callback parent.rows, "<tr><td>" + "<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" + "</td></tr>"
				#launch more uids to render the adds
				posl = parent.targ + "/" + parent.about

				for j in [3...parent.branch.length]
					currBranch = parent.branch[j]
					if currBranch[0] == "ins" and currBranch[1][0] == parent.about and currBranch[1][1] == undefined
						for currBranchType in currBranch[2] when currBranchType[0] == "add"
							locn = parent.loc.concat([ j - 2 ])
							uid = new uidraw(parent.rows + 1 + ++parent.addsout, parent, "<tr><td>", "</td></tr>", rootURI, [], [], parent.filters, locn, not parent.even, parent.ftree, cmod)
							uid.subRowIn()
							break

				parent.callback parent.rows + 1 + parent.adds + 1, "<tr><td>" + "<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" + "</td></tr>"

				#launch a final callback to add the subcollections.
				for mod in cmod[1..] when mod[0] == "fcTp"
					for j in [0...mod[6].length] when mod[6][j][1] == parent.about
						launch = -1

						for j in [3...parent.branch.length] when parent.branch[j][1][0] == mod[1]
							launch = j - 2
							break

						parent.colsout++
						res = ""
						pre = "<tr id='tr--data--" + mod[1] + "'><td>"
						if launch == -1
							pre += mod[2]
						else
							pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + mod[2] + "</div>"
						post = "</td></tr>"
						if launch != -1
							npos = getTarg(parent.ftree, parent.loc, "del", launch)
							pre += "<div style='display:inline;background-color:" + parent.unbg + "'>" + " <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a>" + "</div>"
							subcolcb = callback: (n, prod) ->
								parent.callback n, prod

							uid = new uidraw(parent.rows + 1 + parent.adds + 1 + parent.colsout, subcolcb, pre, post, rootURI, [], [], parent.filters, loc.concat([ launch ]), not parent.even, parent.ftree, cmod)
							uid.subRowIn()
						else
							newb = [ "col", [ mod[1] ], [ "mod" ] ]
							npos = getTarg(parent.ftree, parent.loc, "add", newb)
							pre += " <a href='" + parent.rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>"
							res += (pre + post)
							parent.callback parent.rows + 1 + parent.adds + 1 + parent.colsout, res
		else if @branch[0] == "ins"
			@items = 1
			@pre += "<div class='panel' style='background-color:" + @bg + ";'>"
			@post += "</div>"
			targ = serverAPI(@about, @filters)
			posl = targ
			@id = @branch[1][1]
			actn = "view"

			#find first action.
			for branchType in @branch[2][1..] when branchType[0] in ["add", "edit", "del"]
				actn = branchType[0]
				break

			switch actn
				when "view"
					instance = result.instances[0]
					if @type == "term"
						@targ = serverAPI(@about, @filters)
						serverRequest "GET", @targ, [], "", (statusCode, result, headers) ->
							res = ""

							for item of instance when item != "__clone"
								res += item + ": " + instance[item] + "<br/>"
							parent.callback 1, res
					else if @type == "fcTp"
						@targ = serverAPI(@about, @filters)
						serverRequest "GET", @targ, [], "", (statusCode, result, headers) ->
							res = ""
							res += "id: " + instance.id + "<br/>"
							#loop around terms
							for schema in parent.schema
								if schema[0] == "term"
									res += instance[schema[1] + "_name"] + " "
								else if schema[0] == "verb"
									res += schema[1] + " "
							parent.callback 1, res
				when "add"
					if @type == "term"
						#get schema
						schema = []

						for mod in cmod[1..] when mod[1] == @about
							schema = mod[3]	

						#print form.
						res = "<div align='right'>"
						res += "<form class = 'action' >"
						res += "<input type='hidden' id='__actype' value='addterm'>"
						res += "<input type='hidden' id='__serverURI' value='" + serverAPI(@about, []) + "'>"
						res += "<input type='hidden' id='__backURI' value='" + targ + "'>"
						console.log "addterm backURI=" + targ
						res += "<input type='hidden' id='__type' value='" + @about + "'>"

						for currSchema in schema
							switch currSchema[0]
								when "Text"
									res += currSchema[2] + ": <input type='text' id='" + currSchema[1] + "' /><br />"
								when "ForeignKey"
									alert currSchema
						res += "<input type='submit' value='Submit This'" + " onClick='processForm(" + "this.parentNode" + ");return false;'>"
						res += "</form>"
						res += "</div>"
						@callback 1, res
					else if @type == "fcTp"
						#initialize vars
						trms = []
						trmres = []
						trmsel = {}
						addftcb = (statusCode, result, headers) ->
							res = ""
							trmres.push result.instances
							#construct dropdowns & form
							if trms.length == trmres.length
								for j in [0...trms.length]
									res = "<select id='" + trms[j] + "_id'>"
									#Loop through options
									for currTermRes in trmres[j]
										res += "<option value='" + currTermRes.id + "'>" + currTermRes.name + "</option>"
									res += "</select>"
									trmsel[trms[j]] = res
								res = ""
								res += "<form class = 'action' >"
								res += "<input type='hidden' id='__actype' value='addfctp'>"
								res += "<input type='hidden' id='__serverURI' value='" + serverAPI(parent.about, []) + "'>"
								res += "<input type='hidden' id='__backURI' value='" + posl + "'>"
								res += "<input type='hidden' id='__type' value='" + parent.about + "'>"

								for schema in parent.schema
									if schema[0] == "term"
										res += trmsel[schema[1]] + " "
									else if schema[0] == "verb"
										res += parent.schema[j][1] + " "
								#add submit button etc.
								res += "<div align='right'>"
								res += "<input type='submit' value='Submit This'" + " onClick='processForm(this.parentNode.parentNode);return false;'>"
								res += "</div>"
								res += "</form>"
								parent.callback 1, res

						#TODO: Does this need to be in a separate loop? It might, but can we verify?
						for schema in @schema when schema[0] == "term"
							trms.push schema[1]

						#loop around terms
						for schema in @schema
							if schema[0] == "term"
								tar = serverAPI(schema[1], @filters)
								serverRequest "GET", tar, [], "", addftcb
							else if schema[0] == "verb"
								null
				when "edit"
					if @type == "term"
						schm = ""
						j = 1

						while j < cmod.length
							schm = cmod[j][3]	if cmod[j][1] == @about
							j++
						@targ = serverAPI(@about, @filters)
						serverRequest "GET", @targ, [], "", (statusCode, result, headers) ->
							res = ""
							id = result.instances[0].id
							res = "<div align='left'>"
							res += "<form class = 'action' >"
							res += "<input type='hidden' id='__actype' value='editterm'>"
							res += "<input type='hidden' id='__serverURI' value='" + serverAPI(parent.about, []) + "." + id + "'>"
							res += "<input type='hidden' id='__backURI' value='" + serverAPI(parent.about, []) + "'>"
							res += "<input type='hidden' id='__id' value='" + id + "'>"
							res += "<input type='hidden' id='__type' value='" + parent.about + "'>"
							res += "id: " + id + "<br/>"
							j = 0

							while j < schm.length
								switch schm[j][0]
									when "Text"
										res += schm[j][2] + ": <input type='text' id='" + schm[j][1] + "' value = '" + result.instances[0][schm[j][1]] + "' /><br />"
									when "ForeignKey"
										console.log schm[j]
								j++
							res += "<div align = 'right'>"
							res += "<input type='submit' value='Submit This' " + "onClick='processForm(this.parentNode.parentNode);return false;'>"
							res += "</div>"
							res += "</form>"
							res += "</div>"
							parent.callback 1, res
					else if @type == "fcTp"
						@targ = serverAPI(@about, @filters)
						serverRequest "GET", targ, [], "", (statusCode, result, headers) ->
							resu = result
							trms = []
							trmres = []
							trmsel = {}
							editftcb = (statusCode, result, headers) ->
								res = ""
								trmres.push result.instances
								#construct dropdowns & form
								if trms.length == trmres.length
									respo = ""
									respr = "<div align='left'>"
									respr += "<form class = 'action' >"
									respr += "<input type='hidden' id='__actype' value='editfctp'>"
									respr += "<input type='hidden' id='__serverURI' value='" + serverAPI(parent.about, []) + "." + resu.instances[0].id + "'>"
									respr += "<input type='hidden' id='__backURI' value='" + serverAPI(parent.about, []) + "'>"
									console.log "editfctp backURI=" + serverAPI(parent.about, [])
									respr += "<input type='hidden' id='__id' value='" + resu.instances[0].id + "'>"
									respr += "<input type='hidden' id='__type' value='" + parent.about + "'>"
									j = 0

									while j < trms.length
										res = "<select id='" + trms[j] + "_id'>"
										k = 0
										#Loop through options
										while k < trmres[j].length
											res += "<option value='" + trmres[j][k].id + "'"
											#if current value, print selected
											res += " selected" if resu.instances[0][trms[j] + "_id"] == trmres[j][k].id
											res += ">" + trmres[j][k].name + "</option>"
											k++
										res += "</select>"
										trmsel[trms[j]] = res
										j++
									#merge dropdowns with verbs to create 'form'
									res = ""

									j = 0
									while j < parent.schema.length
										if parent.schema[j][0] == "term"
											res += trmsel[parent.schema[j][1]] + " "
										else if parent.schema[j][0] == "verb"
											res += parent.schema[j][1] + " "
										j++
									#add submit button etc.
									respo += "<div align = 'right'>"
									respo += "<input type='submit' value='Submit This' " + "onClick='processForm(this.parentNode.parentNode);return false;'>"
									respo += "</div>"
									respo += "</form>"
									respo += "</div>"
									parent.callback 1, respr + res + respo

							j = 0

							#TODO: Again, need this be a separate loop?
							while j < parent.schema.length
								trms.push parent.schema[j][1]	if parent.schema[j][0] == "term"
								j++
							j = 0

							#loop around terms
							while j < parent.schema.length
								if parent.schema[j][0] == "term"
									tar = serverAPI(parent.schema[j][1], parent.filters)
									serverRequest "GET", tar, [], "", editftcb
								else	 if parent.schema[j][0] == "verb"
									null
								j++
				when "del"
					#make this a function
					res = "<div align='left'>"
					res += "marked for deletion"
					res += "<div align = 'right'>"
					res += "<form class = 'action' >"
					res += "<input type='hidden' id='__actype' value='del'>"
					res += "<input type='hidden' id='__serverURI' value='" + serverAPI(@about, []) + "." + @id + "'>"
					res += "<input type='hidden' id='__id' value='" + @id + "'>"
					res += "<input type='hidden' id='__type' value='" + @about + "'>"
					res += "<input type='hidden' id='__backURI' value='" + serverAPI(@about, []) + "'>"
					res += "<input type='submit' value='Confirm' " + "onClick='processForm(this.parentNode.parentNode);return false;'>"
					res += "</form>"
					res += "</div>"
					res += "</div>"
					@callback 1, res
	return this

processForm = (forma) ->
	action = $("#__actype", forma).val()
	serverURI = $("#__serverURI", forma).val()
	id = $("#__id", forma).val()
	type = $("#__type", forma).val()
	backURI = $("#__backURI", forma).val()
	#id and type (and half of actype) are not yet used.
	#Should they be used instead of serverURI?
	switch action
		when "editterm", "editfctp"
			editInst forma, serverURI, backURI
		when "addterm", "addfctp"
			addInst forma, serverURI, backURI
		when "del"
			delInst forma, serverURI, backURI

delInst = (forma, uri, backURI) ->
	@backURI = backURI
	serverRequest "DELETE", uri, [], "", (statusCode, result, headers) ->
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
	console.log JSON.stringify(obj)
	serverRequest "PUT", serverURI, [], JSON.stringify(obj), (statusCode, result, headers) ->
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
	serverRequest "POST", uri, [], JSON.stringify(obj), (statusCode, result, headers) ->
		location.hash = "#!" + backURI

	false

#needs to somehow travel to the server...
filtmerge = (branch, fltrs) ->
	filters = jQuery.extend(true, [], fltrs)
	rootURI = "/data/" + branch[1][0]
	i = 1
	#filter -> API uri processing
	#append uri filters
	while i < branch[2].length
		if branch[2][i][0] == "filt"
			branch[2][i][1][1] = branch[1][0]	if branch[2][i][1][1][0] == undefined
			filters.push branch[2][i][1]
		i++
	filters


window.drawData = drawData
window.processForm = processForm

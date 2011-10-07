sqlEditor = null
clientOnAir = false

defaultFailureCallback = (statusCode, error) ->
	if error?
		console.log error
		if error.constructor.name == 'Array'
			if error["status-line"]
				error = error["status-line"]
			else
				error = error.join("<br/>")
	else
		error = [ statusCode ]
	exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>'
	$("#dialog-message").html exc + error
	$("#dialog-message").dialog "open"


defaultSuccessCallback = (statusCode, result, headers) ->


loadState = ->
	serverRequest "GET", "/onAir/", [], "", (statusCode, result) ->
		clientOnAir = result


processHash = ->
	theHash = location.hash
	theHash = "#!/model" if theHash == ""
	if theHash.slice(1, 9) == "!/server"
		URItree = [ [], [ [], [ "server" ] ] ]
	else
		URItree = ClientURIParser.matchAll(theHash, "expr")
	try
		switchVal = URItree[1][1][0]
	catch $e
		switchVal = ""
	switch switchVal
		#IFDEF server
		when "server"
			uri = location.hash.slice(9)
			serverRequest "GET", uri, "", {}, (statusCode, result) ->
				alert result
		when "sql"
			$("#tabs").tabs "select", 3
			sqlEditor.refresh() # Force a refresh on switching to the tab, otherwise it wasn't appearing.
		when "data"
			if clientOnAir == true
				$("#tabs").tabs("select", 4)
				drawData(URItree[1])
			else
				exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>'
				msg = "The data tab is only accessible after a model is executed<br/>"
				$("#dialog-message").html(exc + msg)
				$("#dialog-message").dialog("open")
		when "http"
			$("#tabs").tabs("select", 5)
		when "export"
			importExportEditor.refresh()
			$("#tabs").tabs("select", 6)
		when "preplf"
			break
		#ENDIFDEF
		when "lf"
			lfEditor.refresh()
		else
			sbvrEditor.refresh()
			$("#tabs").tabs("select", 0)


# break loadUI apart to loadState and SetUI (with a view to converting LoadState to a single request)?
loadUI = ->
	window.sbvrEditor = CodeMirror.fromTextArea(document.getElementById("modelArea"), 
		mode: "sbvr"
		onKeyEvent: sbvrAutoComplete
	)
	window.lfEditor = CodeMirror.fromTextArea(document.getElementById("lfArea"))
	if CodeMirror.listModes().indexOf("plsql") > -1
		sqlEditor = CodeMirror.fromTextArea(document.getElementById("sqlArea"), mode: "text/x-plsql")
		window.importExportEditor = CodeMirror.fromTextArea(document.getElementById("importExportArea"), mode: "text/x-plsql")
	window.onhashchange = processHash
	serverRequest "GET", "/ui/textarea*filt:name=model_area/", [], "", (statusCode, result) ->
		sbvrEditor.setValue result.value
	
	serverRequest "GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", [], "", (statusCode, result) ->
		$("#modelArea").attr "disabled", result.value
	
	$("#modelArea").change ->
		serverRequest("PUT", "/ui/textarea*filt:name=model_area/", {"Content-Type": "application/json"}, JSON.stringify(value: sbvrEditor.getValue()))
	
	if clientOnAir == true
		serverRequest "GET", "/lfmodel/", [], "", (statusCode, result) ->
			lfEditor.setValue Prettify.match(result, "elem")
		
		serverRequest "GET", "/prepmodel/", [], "", (statusCode, result) ->
			$("#prepArea").val Prettify.match(result, "elem")
		
		serverRequest "GET", "/sqlmodel/", [], "", (statusCode, result) ->
			sqlEditor.setValue Prettify.match(result, "elem")
	$("#dialog-message").dialog 
		modal: true
		resizable: false
		autoOpen: false
		buttons: 
			"Revise Request": ->
				$(this).dialog "close"
			
			"Revise Model": ->
				$(this).dialog "close"
	
	if clientOnAir == true
		$("#bem").attr "disabled", "disabled"
	else
		$("#bum").attr "disabled", "disabled"
		$("#br").attr "disabled", "disabled"


cleanUp = (a) ->
	a.textContent = "Downloaded"
	a.dataset.disabled = true
	# Need a small delay for the revokeObjectURL to work properly.
	setTimeout (->
		window.URL.revokeObjectURL a.href
	), 1500


window.serverRequest = (method, uri, headers = {}, body = null, successCallback, failureCallback) ->
	#IFDEF server
	successCallback = (if typeof successCallback != "function" then defaultSuccessCallback else successCallback)
	failureCallback = (if typeof failureCallback != "function" then defaultFailureCallback else failureCallback)
	
	$("#httpTable").append "<tr class=\"server_row\"><td><strong>" + method + "</strong></td><td>" + uri + "</td><td>" + (if headers.length == 0 then "" else headers) + "</td><td>" + body + "</td></tr>"
	if typeof remoteServerRequest == "function"
		remoteServerRequest method, uri, headers, body, successCallback, failureCallback
	else
		$.ajax "/node" + uri, 
			headers: headers
			data: body
			error: (jqXHR, textStatus, errorThrown) ->
				failureCallback jqXHR.status
			
			success: (data, textStatus, jqXHR) ->
				successCallback jqXHR.status, JSON.parse(data), jqXHR.getAllResponseHeaders()
			
			type: method
	#ENDIFDEF


window.transformClient = (model) ->
	$("#modelArea").attr "disabled", true
	serverRequest "PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {"Content-Type": "application/json"}, JSON.stringify(value: true), ->
		serverRequest "PUT", "/ui/textarea*filt:name=model_area/", {"Content-Type": "application/json"}, JSON.stringify(value: model), ->
			serverRequest "POST", "/execute/", {"Content-Type": "application/json"}, "", ->
				serverRequest "GET", "/lfmodel/", {}, "", (statusCode, result) ->
					lfEditor.setValue Prettify.match(result, "elem")
					serverRequest "GET", "/prepmodel/", {}, "", (statusCode, result) ->
						$("#prepArea").val Prettify.match(result, "elem")
						serverRequest "GET", "/sqlmodel/", {}, "", (statusCode, result) ->
							sqlEditor.setValue Prettify.match(result, "elem")
							clientOnAir = true
							$("#bum").removeAttr "disabled"
							$("#br").removeAttr "disabled"
							$("#bem").attr "disabled", "disabled"


window.resetClient = ->
	serverRequest "DELETE", "/", [], "", ->
		$("#modelArea").attr "disabled", false
		sbvrEditor.setValue ""
		lfEditor.setValue ""
		$("#prepArea").val ""
		sqlEditor.setValue ""
		$("#bem").removeAttr "disabled"
		$("#bum").attr "disabled", "disabled"
		$("#br").attr "disabled", "disabled"
		clientOnAir = false


window.loadmod = (model) ->
	sbvrEditor.setValue model


window.downloadFile = (filename, text) ->
	MIME_TYPE = "text/plain"
	output = document.querySelector("output")
	window.URL = window.webkitURL or window.URL
	window.BlobBuilder = window.BlobBuilder or window.WebKitBlobBuilder or window.MozBlobBuilder
	prevLink = output.querySelector("a")
	if prevLink
		window.URL.revokeObjectURL prevLink.href
		output.innerHTML = ""
	bb = new BlobBuilder()
	bb.append text
	a = document.createElement("a")
	a.download = filename
	a.href = window.URL.createObjectURL(bb.getBlob(MIME_TYPE))
	a.textContent = "Download ready"
	a.dataset.downloadurl = [ MIME_TYPE, a.download, a.href ].join(":")
	a.draggable = true
	a.classList.add "dragout"
	output.appendChild a
	a.onclick = (e) ->
		return false if "disabled" of @dataset
		cleanUp this


# Initialise controls and shoot off the loadUI & processHash functions
$( ->
	$("#tabs").tabs select: (event, ui) ->
		#IFDEF server
		if ui.panel.id not in ["modelTab", "httpTab"] and clientOnAir == false
			exc = "<span class=\"ui-icon ui-icon-alert\" style=\"float:left; margin:0 7px 50px 0;\"></span>"
			msg = "This tab is only accessible after a model is executed<br/>"
			$("#dialog-message").html exc + msg
			$("#dialog-message").dialog "open"
			false
		else
		#ENDIFDEF
			switch ui.panel.id
				#IFDEF server
				when "prepTab"
					location.hash = "!/preplf/"
				when "sqlTab"
					location.hash = "!/sql/"
				when "dataTab"
					location.hash = "!/data/"
				when "httpTab"
					location.hash = "!/http/"
				when "importExportTab"
					location.hash = "!/export/"
				#ENDIFDEF
				when "lfTab"
					location.hash = "!/lf/"
				else
					location.hash = "!/model/"
			true
	
	loadState()
	loadUI()
	processHash()
	$("#bldb").file().choose (e, input) ->
		handleFiles input[0].files
)
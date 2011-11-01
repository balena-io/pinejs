sqlEditor = null
clientOnAir = false

showErrorMessage = (errorMessage) ->
	$("#dialog-message").html '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>' + errorMessage
	$("#dialog-message").dialog "open"
	
showSimpleError = (errorMessage) ->
	$("#dialog-simple-error").html '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>' + errorMessage
	$("#dialog-simple-error").dialog "open"

defaultFailureCallback = (statusCode, error) ->
	if error?
		console.log error
		if error.constructor.name == 'Array'
			if error["status-line"]
				error = error["status-line"]
			else
				error = error.join("<br/>")
	else
		error = statusCode
	showErrorMessage(error)

defaultSuccessCallback = (statusCode, result, headers) ->


loadState = ->
	serverRequest "GET", "/onAir/", [], "", (statusCode, result) ->
		setClientOnAir(result)


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
			$("#tabs").tabs("select", 4)
			drawData(URItree[1])
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

setClientOnAir = (bool) ->
	clientOnAir = bool
	if clientOnAir == true
		serverRequest "GET", "/lfmodel/", [], "", (statusCode, result) ->
			lfEditor.setValue Prettify.match(result, "elem")
		
		serverRequest "GET", "/prepmodel/", [], "", (statusCode, result) ->
			$("#prepArea").val Prettify.match(result, "elem")
		
		serverRequest "GET", "/sqlmodel/", [], "", (statusCode, result) ->
			sqlEditor.setValue Prettify.match(result, "elem")
		
		$("#bem").attr "disabled", "disabled"
		$("#bum").removeAttr "disabled"
		$("#br").removeAttr "disabled"
	else
		$("#bem").removeAttr "disabled"
		$("#bum").attr "disabled", "disabled"
		$("#br").attr "disabled", "disabled"

# break loadUI apart to loadState and SetUI (with a view to converting LoadState to a single request)?
loadUI = ->
	window.sbvrEditor = CodeMirror.fromTextArea(document.getElementById("modelArea"), 
		mode: "sbvr"
		onKeyEvent: sbvrAutoComplete
		lineWrapping: true
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
	
	$("#dialog-message").dialog 
		modal: true
		resizable: false
		autoOpen: false
		buttons: 
			"Revise Request": ->
				$(this).dialog "close"
			
			"Revise Model": ->
				$(this).dialog "close"
				
	$("#dialog-simple-error").dialog 
		modal: true
		resizable: false
		autoOpen: false
		buttons: 
			"OK": ->
				$(this).dialog "close"

cleanUp = (a) ->
	a.textContent = "Downloaded"
	a.dataset.disabled = true
	# Need a small delay for the revokeObjectURL to work properly.
	setTimeout (->
		window.URL.revokeObjectURL a.href
	), 1500

# successCallback = (statusCode, result, headers)
# failureCallback = (statusCode, error)
window.serverRequest = (method, uri, headers = {}, body = null, successCallback, failureCallback) ->
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
				failureCallback jqXHR.status, JSON.parse(jqXHR.responseText)
			
			success: (data, textStatus, jqXHR) ->
				rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg
				responseHeaders = {}
				responseHeadersString = jqXHR.getAllResponseHeaders()
				while match = rheaders.exec( responseHeadersString )
					responseHeaders[ match[1].toLowerCase() ] = match[2]
				successCallback jqXHR.status, JSON.parse(data), responseHeaders
			
			type: method


window.transformClient = (model) ->
	$("#modelArea").attr "disabled", true
	serverRequest "PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {"Content-Type": "application/json"}, JSON.stringify(value: true), ->
		serverRequest "PUT", "/ui/textarea*filt:name=model_area/", {"Content-Type": "application/json"}, JSON.stringify(value: model), ->
			serverRequest "POST", "/execute/", {"Content-Type": "application/json"}, "", ->
				setClientOnAir(true)


window.resetClient = ->
	serverRequest "DELETE", "/", [], "", ->
		$("#modelArea").attr "disabled", false
		sbvrEditor.setValue ""
		lfEditor.setValue ""
		$("#prepArea").val ""
		sqlEditor.setValue ""
		setClientOnAir(false)


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


#window.serverRequest = (method, uri, headers = {}, body = null, successCallback, failureCallback)

window.saveModel = ->
	serverRequest "POST", "/file", {"Content-Type": "text/plain"}, sbvrEditor.getValue(),
		(statusCode, result) ->
			alert('File Saved')
		(statusCode, error) ->
			alert('Error saving')
			
window.getModel = ->
	serverRequest "GET", "/file", {}, "",
		(statusCode, result) ->
			sbvrEditor.setValue(result)
		(statusCode, error) ->
			# alert('Error')

window.parseModel = ->
	try
		lfEditor.setValue(Prettify.match(SBVRParser.matchAll(sbvrEditor.getValue(), 'expr'),'elem'))
	catch e
		console.log 'Error parsing model', e
		showSimpleError('Error parsing model')
		return
	$('#tabs').tabs('select',1)

# Initialise controls and shoot off the loadUI & processHash functions
$( ->
	$("#tabs").tabs select: (event, ui) ->
		#IFDEF server
		if ui.panel.id not in ["modelTab", "httpTab"] and clientOnAir == false
			showErrorMessage("This tab is only accessible after a model is executed<br/>")
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
	
	loadUI()
	loadState()
	processHash()
	getModel()
	$("#bldb").file().choose (e, input) ->
		handleFiles input[0].files
)
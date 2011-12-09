sqlEditor = null
clientOnAir = false

showErrorMessage = (errorMessage) ->
	$("#dialog-message").html '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>' + errorMessage
	$("#dialog-message").dialog "open"
	
showSimpleError = (errorMessage) ->
	$("#dialog-simple-error").html '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>' + errorMessage
	$("#dialog-simple-error").dialog "open"
	
showUrlMessage = (url) ->
	uiIcon = "ui-icon-check"
	qIndex = window.location.href.indexOf("?")
	if url == "Error parsing model"
		uiIcon = "ui-icon-alert"
		anchor = url
	else 
		if qIndex == -1
			url = window.location.href + "?" + url
		else 
			url = window.location.href[0...qIndex] + "?" + url
		anchor = '<a href=\"'+ url + '\">' + url + '</a>'
	$("#dialog-url-message").html '<span class="ui-icon ' + uiIcon + '" style="float:left; margin:0 7px 50px 0;"></span>' + anchor
	$("#dialog-url-message").dialog "open"

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
	serverRequest "GET", "/onAir/", {}, null, (statusCode, result) ->
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
			serverRequest "GET", uri, {}, null, (statusCode, result) ->
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
		serverRequest "GET", "/lfmodel/", {}, null, (statusCode, result) ->
			lfEditor.setValue Prettify.match(result, "elem")
		
		serverRequest "GET", "/prepmodel/", {}, null, (statusCode, result) ->
			$("#prepArea").val Prettify.match(result, "elem")
		
		serverRequest "GET", "/sqlmodel/", {}, null, (statusCode, result) ->
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
	serverRequest "GET", "/ui/textarea*filt:name=model_area/", {}, null, (statusCode, result) ->
		sbvrEditor.setValue result.value
	
	serverRequest "GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, null, (statusCode, result) ->
		$("#modelArea").attr "disabled", result.value
		
	$("#modelArea").change ->
		serverRequest("PUT", "/ui/textarea*filt:name=model_area/", {}, value: sbvrEditor.getValue())
	
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
				
	$("#dialog-url-message").dialog 
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
	if !headers["Content-Type"]?
		headers["Content-Type"] = "application/json"
	$("#httpTable").append "<tr class=\"server_row\"><td><strong>" + method + "</strong></td><td>" + uri + "</td><td>" + (if headers.length == 0 then "" else headers) + "</td><td>" + body + "</td></tr>"
	if typeof remoteServerRequest == "function"
		remoteServerRequest method, uri, headers, body, successCallback, failureCallback
	else
		if body != null
			body = JSON.stringify(body)
		$.ajax uri, 
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
				successCallback jqXHR.status, data, responseHeaders
			
			type: method


window.transformClient = (model) ->
	$("#modelArea").attr "disabled", true
	serverRequest "PUT", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", {}, {value: true}, ->
		serverRequest "PUT", "/ui/textarea*filt:name=model_area/", {}, {value: model}, ->
			serverRequest "POST", "/execute/", {}, null, ->
				setClientOnAir(true)


window.resetClient = ->
	serverRequest "DELETE", "/", {}, null, ->
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

setupDownloadify = () ->
	Downloadify.create "downloadify",
		filename: "editor.txt"
		data: ->
			sbvrEditor.getValue()
		onError: ->
			showSimpleError "Content Is Empty"
		transparent: false
		swf: "downloadify/Downloadify.swf"
		downloadImage: "downloadify/download.png"
		width: 62	
		height: 22
		transparent: true
		append: false
	locate("#write_file", "downloadify")	

# html 5 file api supports chrome ff; flash implements others	
setupLoadfile = () ->
	if !fileApiDetect()
		flashvars = {}
		params = {
			wmode: "transparent",
			allowScriptAccess: "always"
		}
		attributes = {
			id: "fileloader"
		}
		swfobject.embedSWF("FileLoader/FileLoader.swf", "TheFileLoader", 63, 22, "10", null, flashvars, params, attributes)
		locate("#load_file","fileloader")

		
fileApiDetect = () ->
	if !!window.FileReader and ( $.browser.chrome or $.browser.mozilla )
		return true
	else 
		return false
	
locate = (htmlBotton, flashImage) ->
	pos = $(htmlBotton).offset()
	el = document.getElementById(flashImage).style
	el.position = 'absolute'
	el.zIndex = 1
	if !$.browser.msie || flashImage != "fileloader"
		el.left = pos.left + 'px'
		el.top = pos.top + 'px'
	else 
		pos = $("#write_file").offset()
		el.left = pos.left + 64 + 'px'
		el.top = pos.top + 'px'

relocate = () ->
	locate("#write_file", "downloadify")	
	if !fileApiDetect()
		locate("#load_file", "fileloader")
	
window.toReadFile = () ->
	if fileApiDetect()
		$('#read_file').click()
	
window.readFile = (files) ->
		if files.length
			file = files[0]
			reader = new FileReader()
			if /text/.test(file.type)
				reader.onload = -> 
					sbvrEditor.setValue this.result
				reader.readAsText file
			else
				showSimpleError("Only text file is acceptable.")

window.mouseEventHandle = (id, event) ->
	switch event
		when "e" 
			$(id).addClass("ui-state-hover")			# enter
		when "l" 
			$(id).removeClass("ui-state-hover ui-state-active")		# leave
		when "d" 
			$(id).addClass("ui-state-active")			# down
		else 
			$(id).removeClass("ui-state-active ui-state-hover")	# up
	return false
		
window.saveModel = ->
	serverRequest "POST", "/publish", {"Content-Type": "application/json"}, sbvrEditor.getValue(),
		(statusCode, result) ->
			showUrlMessage(result)
		(statusCode, error) ->
			showSimpleError('Error: ' + error)

window.getModel = ->
	qIndex = window.location.href.indexOf("?")
	if qIndex != -1 
		key = window.location.href[qIndex+1..]
		serverRequest "GET", "/publish/"+key, {}, null,
		(statusCode, result) ->
			sbvrEditor.setValue(result)
		(statusCode, error) ->
			showSimpleError('Error: ' + error)
						

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
	$.browser.chrome = $.browser.webkit && !!window.chrome
	$("#tabs").tabs(select: (event, ui) ->
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
	)
	$('#tabs').show()
	getModel()
	loadUI()
	loadState()
	$("input[class!='hidden-input']").button()
	setupDownloadify()
	setupLoadfile()
	$(window).on("resize", relocate)
	processHash()
	$("#bldb").file().choose (e, input) ->
		handleFiles input[0].files
)
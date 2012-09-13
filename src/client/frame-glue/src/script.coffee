if !SBVR_SERVER_ENABLED? then SBVR_SERVER_ENABLED = true

define(['sbvr-parser/SBVRParser', 'data-frame/ClientURIParser', 'Prettify'], (SBVRParser, ClientURIParser, Prettify) ->
	sqlEditor = null
	sbvrEditor = null
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
			if error.constructor.name == 'Array'
				if error["status-line"]
					error = error["status-line"]
				else
					error = error.join("<br/>")
		else
			error = statusCode
		console.log(error)
		try
			# This is used so we can find the stack trace.
			___STACK_TRACE___.please
		catch stackTrace
			console.error(stackTrace.stack)
		showErrorMessage(error)

	defaultSuccessCallback = (statusCode, result, headers) ->


	loadState = (callback) ->
		serverRequest "GET", "/onAir/", {}, null, (statusCode, result) ->
			setClientOnAir(result)
			callback()


	processHash = ->
		if location.hash.slice(1, 9) == "!/server"
			URItree = [ [], [ [], [ "server" ] ] ]
		else
			URItree = ClientURIParser.matchAll(location.hash, "expr")
		try
			switchVal = URItree[1][1][0]
		catch $e
			switchVal = ""
		if switchVal == 'lf'
			$("#tabs").tabs("select", 1)
			lfEditor.refresh()
		else if switchVal == 'preplf'
			$("#tabs").tabs("select", 2)
		else if SBVR_SERVER_ENABLED and switchVal == 'server'
			uri = location.hash.slice(9)
			serverRequest("GET", uri, {}, null, (statusCode, result) ->
				alert(result)
			)
		else if SBVR_SERVER_ENABLED and switchVal == 'sql'
			$("#tabs").tabs("select", 3)
			sqlEditor.refresh() # Force a refresh on switching to the tab, otherwise it wasn't appearing.
		else if SBVR_SERVER_ENABLED and switchVal == 'data'
			$("#tabs").tabs("select", 4)
			drawData(URItree[1])
		else if SBVR_SERVER_ENABLED and switchVal == 'export'
			$("#tabs").tabs("select", 6)
			importExportEditor.refresh()
		else if switchVal == 'http'
			$("#tabs").tabs("select", 5)
		else
			$("#tabs").tabs("select", 0)
			sbvrEditor.refresh()

	setClientOnAir = (bool) ->
		clientOnAir = bool
		if clientOnAir == true
			serverRequest('GET', '/dev/model?filter=model_type:lf;vocabulary:data', {}, null, (statusCode, result) ->
				lfEditor.setValue(Prettify.match(result.instances[0].model_value, 'Process'))
			)

			serverRequest('GET', '/dev/model?filter=model_type:abstractsql;vocabulary:data', {}, null, (statusCode, result) ->
				$("#prepArea").val(JSON.stringify(result.instances[0].model_value))
			)

			serverRequest('GET', '/dev/model?filter=model_type:sql;vocabulary:data', {}, null, (statusCode, result) ->
				sqlEditor.setValue(JSON.stringify(result.instances[0].model_value))
			)

			$("#bem").button("disable")
			$("#bum, #br").button("enable")
		else
			$("#bem").button("enable")
			$("#bum, #br").button("disable")


	# break loadUI apart to loadState and SetUI (with a view to converting LoadState to a single request)?
	loadUI = ->
		window.sbvrEditor = sbvrEditor = CodeMirror.fromTextArea(document.getElementById("modelArea"),
			mode: {
				name: 'sbvr'
				getOMetaEditor: () -> sbvrEditor
			}
			onKeyEvent: ometaAutoComplete
			lineWrapping: true
		)
		window.lfEditor = CodeMirror.fromTextArea(document.getElementById("lfArea"), mode: null)
		if CodeMirror.listModes().indexOf("plsql") > -1
			sqlEditor = CodeMirror.fromTextArea(document.getElementById("sqlArea"), mode: "text/x-plsql")
			window.importExportEditor = CodeMirror.fromTextArea(document.getElementById("importExportArea"), mode: "text/x-plsql")
		serverRequest("GET", "/ui/textarea?filter=name:model_area/", {}, null,
			(statusCode, result) ->
				sbvrEditor.setValue(result.instances[0].text)
			() ->
				# Ignore an error, it means no model area has been stored
		)

		serverRequest("GET", "/ui/textarea-is_disabled?filter=textarea.name:model_area/", {}, null,
			(statusCode, result) ->
				$("#modelArea").attr("disabled", result.value)
			() ->
				# Ignore an error, it means no model area has been stored
		)
		
		window.onhashchange = processHash

		$("#modelArea").change( ->
			serverRequest("PUT", "/ui/textarea?filter=name:model_area/", {}, [{'textarea.text': sbvrEditor.getValue()}])
		)

		loginDialog = $("#dialog-login")
		window.processLogin = processLogin = () ->
			serverRequest('POST', '/login', {}, {
				username: loginDialog.find('#username').val()
				password: loginDialog.find('#password').val()
			})
			loginDialog.dialog('close')
		window.login = () ->
			loginDialog.html('<label for="username">Username: </label><input id="username" type="text"/><br/><label for="password">Password: </label><input id="password" type="password"/>')
			loginDialog.dialog('open')
		loginDialog.dialog(
			modal: true
			resizable: false
			autoOpen: false
			buttons:
				'Login': processLogin
				'Cancel': ->
					loginDialog.dialog('close')
		)

		$("#dialog-message").dialog(
			modal: true
			resizable: false
			autoOpen: false
			buttons:
				"Revise Request": ->
					$(this).dialog "close"

				"Revise Model": ->
					$(this).dialog "close"
		)

		$("#dialog-simple-error").dialog(
			modal: true
			resizable: false
			autoOpen: false
			buttons:
				"OK": ->
					$(this).dialog "close"
		)

		$("#dialog-url-message").dialog(
			modal: true
			resizable: false
			autoOpen: false
			buttons:
				"OK": ->
					$(this).dialog("close")
		)
					
		$("input[class!='hidden-input']").button()

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
		if !headers["Content-Type"]? and body?
			headers["Content-Type"] = "application/json"
		$("#httpTable").append "<tr class=\"server_row\"><td><strong>" + method + "</strong></td><td>" + uri + "</td><td>" + (if headers.length == 0 then "" else JSON.stringify(headers)) + "</td><td>" + JSON.stringify(body) + "</td></tr>"
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

		serverRequest("PUT", "/ui/textarea-is_disabled?filter=textarea.name:model_area/", {}, null, ->
			serverRequest("PUT", "/ui/textarea?filter=name:model_area/", {}, [{'textarea.text': sbvrEditor.getValue()}], ->
				serverRequest("POST", "/execute/", {}, null, ->
					setClientOnAir(true)
				)
			)
		)

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
			# TODO: Improve build system so we don't have to ../../../......
			swf: "../../../../external/downloadify/Downloadify.swf"
			downloadImage: "../../../../external/downloadify/download.png"
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
			lfEditor.setValue(Prettify.match(SBVRParser.matchAll(sbvrEditor.getValue(), 'Process'),'Process'))
		catch e
			console.log 'Error parsing model', e
			showSimpleError('Error parsing model')
			return
		$('#tabs').tabs('select',1)

	# Initialise controls and shoot off the loadUI & processHash functions
	$( ->
		loadUI()
		loadState( () ->
			$.browser.chrome = $.browser.webkit && !!window.chrome
			$("#tabs").tabs(select: (event, ui) ->
				if SBVR_SERVER_ENABLED and ui.panel.id not in ["modelTab", "httpTab"] and clientOnAir == false
					showErrorMessage("This tab is only accessible after a model is executed<br/>")
					return false
				else
					switchVal = ui.panel.id
					if SBVR_SERVER_ENABLED and switchVal == 'prepTab'
							newHash = "!/preplf/"
					else if SBVR_SERVER_ENABLED and switchVal == 'sqlTab'
						newHash = "!/sql/"
					else if SBVR_SERVER_ENABLED and switchVal == 'dataTab'
						newHash = "!/data/"
					else if SBVR_SERVER_ENABLED and switchVal == 'httpTab'
						newHash = "!/http/"
					else if SBVR_SERVER_ENABLED and switchVal == 'importExportTab'
						newHash = "!/export/"
					else if switchVal == 'lfTab'
						newHash = "!/lf/"
					else
						newHash = "!/model/"

					if location.hash.indexOf(newHash) != 1
						location.hash = newHash
					return true
			)
			$('#tabs').show()
			getModel()
			setupDownloadify()
			setupLoadfile()
			$(window).on("resize", relocate)
			processHash()
			$("#bldb").file().choose( (e, input) ->
				handleFiles input[0].files
			)
		)
	)
)
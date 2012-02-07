requireCSS('codemirror')
requirejs(['codemirror', 'ometa/ometa-base', 'js-beautify', 'jquery.hotkeys'], ->
	requirejs(['codemirror-modes/javascript/javascript', 'ometa/lib', 'ometa/bs-js-compiler', 'ometa/parser',
		'ometa/bs-js-compiler', 'ometa/bs-ometa-compiler', 'ometa/bs-ometa-optimizer', 'ometa/bs-ometa-js-compiler'], () ->
		translateCode = (s) ->
			translationError = (m, i) -> 
					alert("Translation error - please tell Alex about this!"); throw fail 

			# try {
				parsingError = (m, i) ->
					console.log(m)
					start = Math.max(0,i-20)
					console.log('Error around: '+s.substring(start, Math.min(s.length,start+40)))
					console.log('Error around: '+s.substring(i-2, Math.min(s.length,i+2)))
					throw m;

				tree = BSOMetaJSParser.matchAll(s, "topLevel", undefined, parsingError)
				# console.log(tree);
				return BSOMetaJSTranslator.match(tree, "trans", undefined, translationError);
			# }
		  # catch(e) {
			# console.log(e);
			# start = Math.max(0,e.errorPos-20);
			# console.log('Error around: '+s.substring(start, Math.min(s.length,start+40)));
			# throw e;
		  # }

		window.compile = (ometacode) ->
			jscode = translateCode(ometacode + '\n') #'\n' avoids failing on comment-terminated strings.
			cmRaw.setValue(jscode)
			cmFormatted.setValue( js_beautify(jscode) )
			alert('Compilation complete!')
			return jscode
		
		
		window.compileAndRun = (ometacode) ->
			jscode = compile(ometacode)
			evaloutput = "" + eval(jscode)
			console.log(evaloutput)
			outputArea.setValue(evaloutput)
			console.log(jscode)
			alert('Run complete!');

		window.downloadFile = (filename, text) ->
			MIME_TYPE = "text/plain"
			output = document.querySelector("output")
			window.URL = window.webkitURL || window.URL
			window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder
			prevLink = output.querySelector("a")
			if (prevLink)
				window.URL.revokeObjectURL(prevLink.href)
				output.innerHTML = ""
			
			bb = new BlobBuilder()
			bb.append(text)
			a = document.createElement("a")
			a.download = filename
			a.href = window.URL.createObjectURL(bb.getBlob(MIME_TYPE))
			a.textContent = "Download ready"
			a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(":")
			a.draggable = true
			a.classList.add("dragout")
			output.appendChild(a)
			a.onclick = (e) ->
				if ("disabled" in this.dataset)
					return false
				return cleanUp(this)


		$(->
			$("#tabs").tabs({
				show: (event, ui) ->
					cmFormatted.refresh()
					cmRaw.refresh()
			})
			
			bindings = () ->
				$(document).bind('keydown', 'ctrl+y,', () ->
					compileAndRun(ometacodeArea.getValue())
				)
			
			
			$(bindings)
			
			return $("#bldb").file().choose((e, input) ->
				return handleFiles(input[0].files)
			)
		)
		window.ometacodeArea = ometacodeArea = CodeMirror.fromTextArea(document.getElementById("ometacodeArea"), {
			lineNumbers: true,
			matchBrackets: true
		})
		outputArea = CodeMirror.fromTextArea(document.getElementById("outputArea"), {
			lineNumbers: true,
			matchBrackets: true,
			readOnly: true
		})
		cmRaw = CodeMirror.fromTextArea(document.getElementById("jsrawArea"), {
			lineNumbers: true,
			matchBrackets: true,
			readOnly: true
		})
		cmFormatted = CodeMirror.fromTextArea(document.getElementById("jsformattedArea"), {
			lineNumbers: true,
			matchBrackets: true,
			readOnly: true
		})
	)
)

window.onbeforeunload = () ->
	return "You have attempted to leave the OMeta editor. Any unsaved changes will be lost."
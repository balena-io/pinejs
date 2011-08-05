var editor;
(function () {
	/** Start code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/
	// Minimal event-handling wrapper.
	function stopEvent() {
		if (this.preventDefault) {this.preventDefault(); this.stopPropagation();}
		else {this.returnValue = false; this.cancelBubble = true;}
	}
	function addStop(event) {
		if (!event.stop) event.stop = stopEvent;
		return event;
	}
	function connect(node, type, handler) {
		function wrapHandler(event) {handler(addStop(event || window.event));}
		if (typeof node.addEventListener == "function")
			node.addEventListener(type, wrapHandler, false);
		else
			node.attachEvent("on" + type, wrapHandler);
	}

	function forEach(arr, f) {
		for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
	}

	editor = CodeMirror.fromTextArea(document.getElementById("modelArea"), {
		mode:  "sbvr"/*,
		onKeyEvent: function(i, e) {
			// Hook into ctrl-space
			if (e.keyCode == 32 && (e.ctrlKey || e.metaKey) && !e.altKey) {
				e.stop();
				return startComplete();
			}
		}*/
	});
	/** End code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/

	function startComplete() {
		// We want a single cursor position.
		if (editor.somethingSelected()) return;
		// Find the token at the cursor
		var cur = editor.getCursor(false), token = editor.getTokenAt(cur);
		var completions = getCompletions(token);
		
		if (!completions.length) return;
		function insert(str) {
			editor.replaceRange(str+" ", {line: cur.line, ch: token.start}, {line: cur.line, ch: token.end});
		}
		// When there is only one completion, use it directly.
		if (completions.length == 1) {insert(completions[0]); return true;}

		// Build the select widget
		var complete = document.createElement("div");
		complete.className = "completions";
		var sel = complete.appendChild(document.createElement("select"));
		sel.multiple = true;
		for (var i = 0; i < completions.length; ++i) {
			var opt = sel.appendChild(document.createElement("option"));
			opt.appendChild(document.createTextNode(completions[i]));
		}
		sel.firstChild.selected = true;
		sel.size = Math.min(10, completions.length);
		var pos = editor.cursorCoords();
		complete.style.left = pos.x + "px";
		complete.style.top = pos.yBot + "px";
		complete.style.position = "absolute";
		document.body.appendChild(complete);
		// Hack to hide the scrollbar.
		if (completions.length <= 10)
			complete.style.width = (sel.clientWidth - 1) + "px";

		var done = false;
		function close() {
			if (done) return;
			done = true;
			complete.parentNode.removeChild(complete);
		}
		function pick() {
			insert(completions[sel.selectedIndex]); //Changed this line to insert the actual completion rather than the text in the select element, the select element removes leading and trailing whitespace.
			close();
			setTimeout(function(){editor.focus();}, 50);
		}
		connect(sel, "blur", close);
		connect(sel, "keydown", function(event) {
			var code = event.keyCode;
			// Enter
			if (code == 13) {event.stop(); pick();} //Changed to only respond on enter as there are multi word completions.
			// Escape
			else if (code == 27) {event.stop(); close(); editor.focus();}
			//Backspace
			else if (code == 8 && token.string.length == 0) {event.stop(); close(); editor.focus();}
			else if (code != 38 && code != 40) {close(); editor.focus(); setTimeout(startComplete, 50);}
		});
		connect(sel, "dblclick", pick);

		sel.focus();
		// Opera sometimes ignores focusing a freshly created node
		if (window.opera) setTimeout(function(){if (!done) sel.focus();}, 100);
		return true;
	}
	
	//Declare some static completion options.
	var modRules = ["It is obligatory that",
						"It is necessary that",
						"It is prohibited that",
						"It is impossible that",
						"It is not possible that",
						"It is possible that",
						"It is permissible that"
					],
			quantifiers = ["each",
							"a ", "an ", "some",
							"at most",
							"at least",
							"more than",
							"exactly"],
			quantities = ["one","1","2","3","4","5","6","7","8","9"],
			joiningQuantifiers = ["and at most"],
			keywords = [
							"the",
							"one",
							"and",
							"that"],
			lineStarts = ["T:", "F:", "R:"],
			lineEnd = ".";

	function getCompletions(token) {
		var found = [], start = token.string.toLowerCase(), whitespace = "";
		if(/^[\W]*$/.test(token.string)) {
			start = "";
			whitespace = token.string;
		}
		
		/** Start code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/
		function maybeAdd(str) {
			if (str.toLowerCase().indexOf(start) == 0) found.push(whitespace+str);
		}
		function gatherCompletions(obj) {
			if (typeof obj == "string") forEach(stringProps, maybeAdd);
			else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
			else if (obj instanceof Function) forEach(funcProps, maybeAdd);
			for (var name in obj) maybeAdd(name);
		}
		/** End code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/
		
		if(token.start=="0" || token.state.type=="")
		{
			forEach(lineStarts, maybeAdd);
		}
		else
		{
			switch(token.state.type)
			{
				case "fact":
					switch(token.state.subType)
					{
						case "factDecl":
							forEach(token.state.plural ? token.state.pluralTerms : token.state.terms, maybeAdd);
						break;
						case "term":
							forEach(token.state.plural ? token.state.pluralVerbs : token.state.verbs, maybeAdd);
							if(token.state.termEncountered) {
								forEach(lineEnd, maybeAdd);
							}
						break;
						case "verb":
							forEach(token.state.plural ? token.state.pluralTerms : token.state.terms, maybeAdd);
							forEach(lineEnd, maybeAdd);
						break;
					}
				break;
				case "rule":
					switch(token.state.subType)
					{
						case "term":
							forEach(token.state.plural ? token.state.pluralVerbs : token.state.verbs, maybeAdd);
							if(token.state.termEncountered) {
								forEach(lineEnd, maybeAdd);
							}
						break;
						case "verb":
							forEach(quantifiers, maybeAdd);
							//forEach(token.state.facts, maybeAdd);
						break;
						case "quantifier":
							forEach(token.state.plural ? token.state.pluralTerms : token.state.terms, maybeAdd);
						break;
						case "qualifiedQuantifier":
							forEach(quantities, maybeAdd);
						break;
						case "quantity":
							if(token.state.joinable) {
								forEach(joiningQuantifiers, maybeAdd);
							}
							forEach(token.state.plural ? token.state.pluralTerms : token.state.terms, maybeAdd);
						break;
						case "fact":
							forEach(lineEnd, maybeAdd);
						break;
						case "modifier":
							forEach(quantifiers, maybeAdd);
						break;
						default:
							forEach(modRules, maybeAdd);
						break;
					}
			}
		}
		return found;
	}
})();
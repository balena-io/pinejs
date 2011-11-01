var sbvrAutoComplete = (function () {
	return function(instance, e) {
		// Hook into ctrl-space
		if (e.keyCode == 32 && (e.ctrlKey || e.metaKey) && !e.altKey) {
			e.stop();
			return startComplete(instance);
		}
	}
	
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

	function forEach(o, f) {
		if($.isArray(o))
			for (var i = 0, e = o.length; i < e; ++i) f(o[i]);
		else
			for (var i in o) f(i);
	}
	/** End code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/

	function startComplete(editor) {
		// We want a single cursor position.
		if (editor.somethingSelected()) return;
		// Find the token at the cursor
		var cur = editor.getCursor(false), token = editor.getTokenAt(cur);
		var completions = getCompletions(editor);
		
		if (!completions.length) return;
		function insert(str) {
			editor.replaceRange(str+" ", {line: cur.line, ch: token.start}, cur);
		}
		// When there is only one completion, use it directly.
		if (completions.length == 1) {insert(completions[0]); return true;}

		// Build the select widget
		var complete = document.createElement("div");
		complete.className = "completions";
		var sel = complete.appendChild(document.createElement("select"));
		// Opera doesn't move the selection when pressing up/down in a
		// multi-select, but it does properly support the size property on
		// single-selects, so no multi-select is necessary.
		if (!window.opera) sel.multiple = true;
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
			else if (code == 8 && token.string.length == 1) {event.stop(); close(); editor.focus();}
			else if (code != 38 && code != 40) {close(); editor.focus(); setTimeout(function(){startComplete(editor)}, 50);}
		});
		connect(sel, "dblclick", pick);

		sel.focus();
		// Opera sometimes ignores focusing a freshly created node
		if (window.opera) setTimeout(function(){if (!done) sel.focus();}, 100);
		return true;
	}
	
	function getCompletions(editor) {
		var cur = editor.getCursor(false),
			token = editor.getTokenAt(cur),
			tokenString = token.string.substr(0,cur.ch-token.start),
			state = $.extend(true,{},editor.getTokenAt({line: cur.line, ch: 0}).state);
		
		
		var found = [], start = tokenString.toLowerCase(), whitespace = "", whitespaceRegexp = /^[\W]+/;
		if(whitespaceRegexp.test(start)) {
			whitespace = whitespaceRegexp.exec(start)[0];
			start = start.replace(whitespace, '');
		}
		
		try {
			state._tokens = [];
			state.__possibilities = [];
			state.matchAll(editor.getLine(cur.line).substring(0,cur.ch),'line');
		}
		catch(e) {}
		
		
		/** Start code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/
		function maybeAdd(str) {
			if (str.toLowerCase().indexOf(start) == 0) found.push(whitespace+str);
		}
		/** End code reused from example auto-completion (http://codemirror.net/demo/complete.js) **/

		var poss = state.__possibilities;
		var possMap = state.possMap;
		
		for(var i=cur.ch;i>=0;i--) {
			if(poss[i] != undefined) {
				for(rule in poss[i]) {
					ruleMap = possMap[rule];
					console.log(ruleMap);
					try {
						if($.isArray(ruleMap)) {
							forEach(ruleMap, maybeAdd);
						}
						else {
							for(prop in ruleMap) {
								if(typeof ruleMap[prop] == 'object') {
									console.log(""+poss[i][rule][0])
									if(ruleMap.hasOwnProperty(""+poss[i][rule][0])) {
										forEach(ruleMap[poss[i][rule][0]], maybeAdd);
									}
								}
								else {
									forEach(ruleMap, maybeAdd);
								}
								break;
							}
						}
					} catch (e) {
						console.log(e);
					}
				}
				break;
			}
		}
		return found;
	}
})()
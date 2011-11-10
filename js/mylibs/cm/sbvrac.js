var sbvrAutoComplete = (function () {
	function forEach(o, f) {
		if($.isArray(o))
			for (var i = 0, e = o.length; i < e; ++i) f(o[i]);
		else
			for (var i in o) f(i);
	}
	
	function arrayContains(arr, item) {
		if (!Array.prototype.indexOf) {
			var i = arr.length;
			while (i--) {
				if (arr[i] === item) {
					return true;
				}
			}
			return false;
		}
		return arr.indexOf(item) != -1;
	}
	CodeMirror.sbvrHint = function(editor) {
		var cur = editor.getCursor(false),
			token = editor.getTokenAt(cur),
			tokenString = token.string.substr(0,cur.ch-token.start),
			state = $.extend(true,{},editor.getTokenAt({line: cur.line, ch: 0}).state);
		
		var found = [], start = tokenString.toLowerCase(), whitespace = "", whitespaceRegexp = /^[\W]+/;
		if(whitespaceRegexp.test(start)) {
			whitespace = whitespaceRegexp.exec(start)[0];
			start = start.replace(whitespace, '');
		}

		function maybeAdd(str) {
			if (str.toLowerCase().indexOf(start) == 0 && !arrayContains(found, str)) found.push(whitespace+str+" ");
		}
		
		try {
			state._tokens = [];
			state.__possibilities = [];
			state.matchAll(editor.getLine(cur.line).substring(0,cur.ch),'line');
		}
		catch(e) {}

		var poss = state.__possibilities;
		var possMap = state.possMap;
		
		for(var i=cur.ch;i>=0;i--) {
			if(poss[i] != undefined) {
				for(rule in poss[i]) {
					ruleMap = possMap[rule];
					try {
						if($.isArray(ruleMap)) {
							forEach(ruleMap, maybeAdd);
						}
						else {
							for(prop in ruleMap) {
								if(typeof ruleMap[prop] == 'object') {
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
		return {list: found,
			from: {line: cur.line, ch: token.start},
			to: {line: cur.line, ch: token.end}};
	}
	return function(instance, e) {
		// Hook into ctrl-space
		if (e.keyCode == 32 && (e.ctrlKey || e.metaKey) && !e.altKey) {
			e.stop();
			return CodeMirror.simpleHint(instance, CodeMirror.sbvrHint);
		}
	}
})();
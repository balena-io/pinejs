var ometaAutoComplete = (function () {
	var forEach = function (o, f) {
		if($.isArray(o))
			for (var i = 0, e = o.length; i < e; ++i) f(o[i]);
		else
			for (var i in o) f(i);
	},
	arrayContains = function(arr, item) {
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
	};
	
	CodeMirror.ometaHint = function(editor) {
		var cur = editor.getCursor(false),
			text = editor.getRange({ch:0, line:0}, cur),
			modeName = editor.getOption('mode').name,
			mode = CodeMirror.getMode(null, modeName),
			grammar = mode.getGrammar(),
			token = editor.getTokenAt(cur),
			tokenString = token.string.substr(0,cur.ch-token.start);
		
		var found = [], start = tokenString.toLowerCase(), whitespace = "", whitespaceRegexp = /^[\W]+/;
		if(whitespaceRegexp.test(start)) {
			whitespace = whitespaceRegexp.exec(start)[0];
			start = start.replace(whitespace, '');
		}

		var maybeAdd = function(str) {
			if (str.toLowerCase().indexOf(start) == 0 && !arrayContains(found, str)) found.push(whitespace+str+" ");
		},
		addPossibilities = function(ruleMap, ruleArgs) {
			var i;
			if($.isArray(ruleMap)) {
				forEach(ruleMap, maybeAdd);
			}
			else if($.isFunction(ruleMap)) {
				addPossibilities(ruleMap.apply(grammar, ruleArgs));
			}
			else {
				for(prop in ruleMap) {
					if(typeof ruleMap[prop] == 'object') {
						if(ruleMap.hasOwnProperty(""+ruleArgs[0])) {
							forEach(ruleMap[ruleArgs[0]], maybeAdd);
						}
					}
					else {
						forEach(ruleMap, maybeAdd);
					}
					break;
				}
			}
		};
		
		try {
			grammar._enableBranchTracking(grammar.branches);
			grammar._enableTokens();
			grammar.matchAll(text,'Process');
		}
		catch(e) {}

		var branches = grammar._getBranches();
		var hintBranches = grammar.branches;
		
		for(var i = branches.length; i >= 0; i--) {
			if(branches[i] != null) {
				for(rule in branches[i]) {
					try {
						addPossibilities(hintBranches[rule], branches[i][rule]);
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
			return CodeMirror.simpleHint(instance, CodeMirror.ometaHint);
		}
	}
})();
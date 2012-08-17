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
			token = editor.getTokenAt(cur),
			tokenString = token.string.substr(0,cur.ch-token.start),
			grammar = editor.getTokenAt({line: cur.line, ch: 0}).state.grammar.clone();
		
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
			grammar._enableBranchTracking(grammar.possMap);
			branches = grammar._getBranches();
			branches.splice(0, branches.length);
			grammar.matchAll(editor.getLine(cur.line).substring(0,cur.ch),'line');
		}
		catch(e) {}

		var possMap = grammar.possMap;
		
		for(var i=cur.ch;i>=0;i--) {
			if(branches[i] != null) {
				for(rule in branches[i]) {
					try {
						addPossibilities(possMap[rule], branches[i][rule]);
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
define(['codemirror'], function (CodeMirror) {
	var forEach = function (o, f) {
		if($.isArray(o))
			for (var i = 0, e = o.length; i < e; ++i) f(o[i]);
		else
			for (var i in o) {
				if(o.hasOwnProperty(i)) {
					f(i);
				}
			}
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
	
	return function(prependText) {
		var ometaHint = function(editor) {
			var modeName = editor.getOption('mode').name,
				mode = CodeMirror.getMode(null, modeName),
				grammar = mode.getGrammar(),
				cur = editor.getCursor(false),
				text = editor.getRange({ch:0, line:0}, cur),
				token = editor.getTokenAt(cur),
				tokenString = token.string.substr(0,cur.ch-token.start);
			if(prependText != null) {
				text = prependText() + text;
			}
			
			var found = [], start = tokenString.toLowerCase(), whitespace = "", whitespaceRegexp = /^[\s]+/;
			if(whitespaceRegexp.test(start)) {
				whitespace = whitespaceRegexp.exec(start)[0];
				start = start.replace(whitespace, '');
			}

			var maybeAdd = function(str) {
				if (str.toLowerCase().indexOf(start) == 0 && !arrayContains(found, str)) found.push(whitespace+str+" ");
			},
			addPossibilities = function(ruleMap, ruleArgs) {
				if($.isArray(ruleMap)) {
					forEach(ruleMap, maybeAdd);
				}
				else if($.isFunction(ruleMap)) {
					addPossibilities(ruleMap.apply(grammar, ruleArgs));
				}
				else {
					for(var prop in ruleMap) {
						if(ruleMap.hasOwnProperty(prop)) {
							// If ruleMap[prop] is an object then we should be looking at a dictionary lookup based on the first argument.
							if(typeof ruleMap[prop] == 'object') {
								// Do the dictionary lookup
								var lookupVal = '' + ruleArgs.shift();
								if(ruleMap.hasOwnProperty(lookupVal)) {
									addPossibilities(ruleMap[lookupVal], maybeAdd);
								}
								else {
									console.warn('Did not find a matching lookup property', lookupVal, ruleArgs, ruleMap);
								}
							}
							else {
								forEach(ruleMap, maybeAdd);
							}
							break;
						}
					}
				}
			};
			
			try {
				grammar._enableBranchTracking(grammar.branches);
				grammar._enableTokens();
				grammar.matchAll(text, 'Process');
			}
			catch(e) {}

			var branches = grammar._getBranches();
			var hintBranches = grammar.branches;
			
			var lookingForBranch = true;
			var tokenStart = text.length - (cur.ch - token.start);
			
			var checkBranch = function(currBranch) {
				if(currBranch != null) {
					for(var rule in currBranch) {
						if(currBranch.hasOwnProperty(rule)) {
							try {
								addPossibilities(hintBranches[rule], currBranch[rule]);
							} catch (e) {
								console.log(e);
							}
						}
					}
					lookingForBranch = false;
				}
			};
			// Iterate forwards from the start of the token, so completions are added in an order that feels right when using.
			for(var i = tokenStart; i < branches.length; i++) {
				checkBranch(branches[i]);
			}
			// If we didn't find any then look backwards for the first set of completions we find.
			for(var i = tokenStart - 1; lookingForBranch && i >= 0; i--) {
				checkBranch(branches[i]);
			}
			return {
				list: found,
				from: {line: cur.line, ch: token.start},
				to: {line: cur.line, ch: token.end}
			};
		};
		return function(instance, e) {
			// Hook into ctrl-space
			if (e.keyCode == 32 && (e.ctrlKey || e.metaKey) && !e.altKey) {
				e.stop();
				return CodeMirror.simpleHint(instance, ometaHint);
			}
		};
	};
});

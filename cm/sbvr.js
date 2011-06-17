CodeMirror.defineMode("sbvr", function(config) {

	function tokenize(stream, state) {
		var caseInsensitive = false;
		function cased(str) {return caseInsensitive ? str.toLowerCase() : str;}; //Taken from CodeMirror 2 (https://github.com/marijnh/CodeMirror2/blob/master/lib/codemirror.js) as it is within a closure there so not available to this code.
		
		//Helper function to add a verb, accounting for singular/plural versions and making sure to only add each verb once.
		function addVerb(verb) {
			verb = $.trim(verb);
			if(verb.length == 0) {
				return false;
			}
			verb = " "+verb.toLowerCase()+" "; //Add whitespace so that the pattern matches for is/are at the start/end of the verb
			verb = verb.replace(/ [aA][rR][eE] /," is ");
			if($.inArray(verb, state.verbs) == -1) {
				state.verbs.push($.trim(verb));
			}
			verb = verb.replace(/ [iI][sS] /," are ");
			if($.inArray(verb, state.pluralVerbs) == -1) {
				state.pluralVerbs.push($.trim(verb));
			}
			return true;
		}
		
		//Runs a match against each element of the array and returns true if it finds a result and false if it does not.
		function matchArray(array, consume) {
			for (var i = 0; i < array.length; ++i) {
				if(stream.match(array[i], consume, caseInsensitive)) {
					return true;
				}
			}
			return false;
		}
		
		//Processes an array to find a match and if so returns the correct style/sets the subType correctly, otherwise returns false.  This function helps to reduce a lot of code replication.
		function processArray(array, first, style, subType) {
			var pos = stream.pos;
			if(matchArray(array, first)) {
				if(first===true) {
					state.subType = subType;
					return style;
				}
				else {
					stream.pos = pos;
					return state.type;
				}
			}
			return false;
		}
	
		if(stream.sol() || $.trim(stream.string.slice(0,stream.pos)).length == 0) { //If we are at the start of the line or there is only whitespace up to this point then check for the T: F: R: to declare the type of the line, an extension to SBVR to make parsing easier..
			if (stream.match(/[tT]:/)) {
				state.type = "term";
				return state.subType = "termDecl";
			}
			if (stream.match(/[fF]:/)) {
				state.type = "fact";
				return state.subType = "factDecl";
			}
			if (stream.match(/[rR]:/)) {
				state.type = "rule";
				return state.subType = "ruleDecl";
			}
		}
	
		var modRules = ["It is obligatory that",
						"It is necessary that",
						"It is prohibited that",
						"It is impossible that",
						"It is not possible that",
						"It is possible that",
						"It is permissible that"
					],
			//Quantifiers which need a number to follow them.
			qualifiedQuantifier = ["at most",
							"more than",
							"exactly"],
			joinableQualifiedQuantifier = ["at least"],
			quantifiers = ["each",
							"a ", "an ",
							
							 //TODO: What aret these technically?
							"the",
							"and",
							"that"],
			pluralQuantifiers = ["some"],
			quantities = ["one",/^\d+/];
		var ch, str = "";
		
		//Default state stuff
		var previousJoinable = state.joinable;
		state.joinable = false;
		state.plural = false;
		
		if(state.type == "term") {
			stream.skipToEnd();
			var term = $.trim(cased(stream.current()));
			state.terms.push(term.singularize());
			state.pluralTerms.push(term.pluralize());
			state.terms.sort(
				function(a, b) {
					if (a.length < b.length)
						return -1;
					if (a.length > b.length)
						return 1;
					return 0;
				});
		}
		else {
			
			//This is a bit of preprocessing to check if the term is found anywhere in the line and therefore reduce the number of matches necessary to be run for each word to only those that appear in the line, not noticeable on most documents but may be fairly noticeable on a document with lots of terms.
			if(!state.matchingSearchesFound) {
				state.matchingSearchesFound = true;
				//Plural terms first, otherwise any with an extra s' won't be matches.
				for (var i = 0; i < state.pluralTerms.length; ++i) {
					var match = cased(stream.string).indexOf(state.pluralTerms[i], stream.pos);
					if(match!=-1) {
						state.matchingSearches.pluralTerms.push(state.pluralTerms[i]);
					}
				}
				for (var i = 0; i < state.terms.length; ++i) {
					var match = cased(stream.string).indexOf(state.terms[i], stream.pos);
					if(match!=-1) {
						state.matchingSearches.terms.push(state.terms[i]);
					}
				}
			}
			var first = true;
			
			do {
				var pos = stream.pos;
				stream.eatSpace();
				
				//Matches that only apply when we are within a rule.
				if(state.type == "rule") {
					var returnedStyle;
					var plural = false;
					//Check for plural quantifiers and set plural to true if found, then check for singular quantifiers.
					if(((returnedStyle = processArray(pluralQuantifiers, first, state.type + "Quantifier", "quantifier")) !== false && (plural = true))|| 
						(returnedStyle = processArray(quantifiers, first, state.type + "Quantifier", "quantifier")) !== false ) {
						if(first===true) {
							state.plural = plural; //Set the state.plural property only if we are actually setting the token for the quantifier (rather than whitespace/other leading up to it).
						}
						return returnedStyle;
					}
					
					//Check for quantifiers that require an explicit quantity to follow them, eg At least X.
					if((returnedStyle = processArray(qualifiedQuantifier, first, state.type + "Quantifier", "qualifiedQuantifier")) !== false) {
						return returnedStyle;
					}
					
					//Check for quantifiers that require an explicit quantity to follow them and can be joined to another quantifier, eg At least X and at most Y.
					if((returnedStyle = processArray(joinableQualifiedQuantifier, first, state.type + "Quantifier", "qualifiedQuantifier")) !== false) {
						if(first===true) {
							state.joinable = true;
						}
						return returnedStyle;
					}
					
					//Check for a quantity and carry across the joinable property as well as setting the plural property if the quantity doesn't equal 1.
					if((returnedStyle = processArray(quantities, first, state.type + "Quantity", "quantity")) !== false) {
						if(first===true) {
							if(!isNaN(stream.current()) && parseInt(stream.current()) != 1) {
								state.plural = true;
							}
							if(previousJoinable) {
								state.joinable = true;
							}
							state.subType = "quantity";
							return state.type + "Quantity";
						}
						return returnedStyle;
					}
					
					//Check for modifiers.
					if((returnedStyle = processArray(modRules, first, state.type + "Modifier", "modifier")) !== false) {
						return returnedStyle;
					}
					//Check for verbs.
					if((returnedStyle = processArray(state.verbs, first, state.type + "Verb", "verb")) !== false) {
						return returnedStyle;
					}
					//Check for plural verbs.
					if((returnedStyle = processArray(state.pluralVerbs, first, state.type + "Verb", "verb")) !== false) {
						return returnedStyle;
					}
				}
				
				plural = false;
				//Check for singular and plural terms.
				if(((returnedStyle = processArray(state.matchingSearches.pluralTerms, first, state.type + "Term", "term")) !== false && (plural = true))|| 
					(returnedStyle = processArray(state.matchingSearches.terms, first, state.type + "Term", "term")) !== false ) {
					if(first===true) {
						state.plural = plural;
					}
					else {
						//If we are currently in a fact then the text leading up to the term should be a verb so we add it to our list of verbs.
						if(state.type == "fact") {
							if(addVerb(stream.current())) {
								state.subType = "verb";
								return state.type + "Verb";
							}
						}
					}
					return returnedStyle;
				}
				
				first = false;
			} while(stream.skipTo(' ') === true);
			stream.skipToEnd();
			if(state.type == "fact") {
				do {
					stream.backUp(1);
				} while(stream.peek().match(/\s/));
				stream.next();
				if(addVerb(stream.current())) {
					state.subType = "verb";
					return state.type + "Verb";
				}
			}
		}
		return state.type;
	}

	return {
		startState: function(base) {
			return {		baseIndent: base || 0,
							type: "",
							subType: "",
							joinable: false,
							plural: false,
							terms: [],
							pluralTerms: [],
							matchingSearchesFound: false,
							matchingSearches: {
								terms: [],
								pluralTerms: []},
							termEncountered: false, //Required for autocompletion
							verbs: [],
							pluralVerbs: []};
		},

		token: function(stream, state) {
			if(stream.sol()) { //Reset most of the state because it's a new line.
				state.type = "";
				state.subType = "";
				state.joinable = false,
				state.plural = false,
				state.matchingSearchesFound = false;
				state.matchingSearches = {
					terms: [],
					pluralTerms: []},
				state.termEncountered = false;
			}
			//Ignore whitespace between words.
			if (stream.eatSpace()) return null;
			if(state.subType == "term") {
				state.termEncountered = true;
			}
			var style = tokenize(stream, state);
			return "sbvr-"+style;
		},

		indent: function(state, textAfter) {
			return 0; //We don't indent SBVR
		}
	};
});

CodeMirror.defineMIME("text/sbvr", "sbvr");
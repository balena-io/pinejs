define(['codemirror'], function() {
	return function(ometaGrammar, modeName, mimeType, options) {
		options = options || {};
		options = {
			disableReusingMemoizations: options.disableReusingMemoizations || false,
			disableVisibleOnlyHighlighting: options.disableVisibleOnlyHighlighting || false
		};
		var getGrammar = (function() {
				var grammar = ometaGrammar.createInstance();
				if(!options.disableReusingMemoizations) {
					grammar.enableReusingMemoizations(grammar._sideEffectingRules);
				}
				grammar._enableTokens();
				return function() {
					if(grammar.reset) {
						grammar.reset();
					}
					return grammar;
				};
			})(),
			removeOldTokens = function(state) {
				for(var i = 0; i < state.currentTokens.length; i++) {
					if(state.currentTokens[i][0] <= state.index) {
						state.currentTokens.splice(i, 1);
						i--;
					}
				}
			},
			addNewTokens = function(state, tokens) {
				// Check current and backtrack to add available tokens
				for(var i = state.index; i >= state.previousIndex; i--) {
					if(tokens[i] != null) {
						state.currentTokens = state.currentTokens.concat(tokens[i]);
					}
				}
				state.previousIndex = state.index;
				// Remove any useless tokens we may have just added.
				removeOldTokens(state);
			},
			getNextToken = function(state) {
				removeOldTokens(state);
				var token = state.currentTokens[0];
				for(var i = 1; i < state.currentTokens.length; i++) {
					if(state.currentTokens[i][0] < token[0]) {
						token = state.currentTokens[i];
					}
				}
				return token;
			};
		CodeMirror.defineMode(modeName, function(config, mode) {
			var tokens = [],
				tokensOffset = 0,
				checkForNewText = (function() {
					var previousText = '',
						prevLastVisibleLine = 0,
						buildTokens = function(input, shift) { 
							var tokens = [], idx;
							try {
								do {
									tokens[input.idx] = input.tokens;
								} while(input = input.tail());
							}
							catch(e) {
								// Ignore the error, it's due to hitting the end of input.
							}
							return tokens;
						};
					return function() {
						var ometaEditor = mode.getOMetaEditor();
						if(ometaEditor == null) {
							return;
						}
						var text = ometaEditor.getValue(),
							prependText = '',
							lastVisibleLine = ometaEditor.getViewport().to;
						if(mode.hasOwnProperty('prependText')) {
							prependText = mode.prependText();
						}
						// We only regenerate tokens if the text has changed, or the last visible line is further down than before.
						if(text != previousText || (!options.disableVisibleOnlyHighlighting && lastVisibleLine > prevLastVisibleLine)) {
							previousText = text;
							if(!options.disableVisibleOnlyHighlighting) {
								prevLastVisibleLine = lastVisibleLine;
								var lastVisibleIndex = 0;
								for(var i = 0; i < lastVisibleLine; i++) {
									lastVisibleIndex = text.indexOf('\n', lastVisibleIndex);
									if(lastVisibleIndex === -1) {
										// We were on the last line so found no newline character, which means we just use the full text rather than partial.
										lastVisibleIndex = text.length;
										break;
									}
									// Increment the pointer to get to the start of the next line.
									lastVisibleIndex++;
								}
								// Trim the text to only what is visible before parsing it.
								text = text.slice(0, lastVisibleIndex);
							}
							text = prependText + text;
							var grammar = getGrammar();
							try {
								grammar.matchAll(text, 'Process');
							}
							catch(e) {
								// An error here means we failed to parse the text,
								// we can ignore it though as we just want to highlight what is valid,
								// after all they're probably just in the middle of typing.
								// console.error(e, e.stack);
							}
							tokens = buildTokens(grammar.inputHead);
							tokensOffset = prependText.length;
						}
					}
				})(),
				eol = function(state, stream) {
					if(stream && !stream.eol()) {
						return;
					}
					// We check in case they deleted everything.
					checkForNewText();
					state.index++;
				},
				applyTokens = function(stream, state) {
					var startPos = stream.pos;
					if(stream.eatSpace()) {
						state.index += stream.pos - startPos;
						eol(state, stream);
						return null;
					}
					var token = getNextToken(state);
					var totalAdvanceDistance = token[0] - state.index;
					var advanceDistance = stream.string.length - stream.pos;
					advanceDistance = Math.min(advanceDistance, totalAdvanceDistance);
					stream.pos += advanceDistance;
					state.index += advanceDistance;
					eol(state, stream);
					return modeName + '-' + token[1];
				};
			return {
				copyState: function(state) {
					return {
						index: state.index,
						previousIndex: state.previousIndex,
						currentTokens: state.currentTokens
					};
				},
				
				startState: function() {
					return {
						index: tokensOffset,
						previousIndex: -1,
						currentTokens: []
					};
				},
				
				blankLine: eol,

				token: function(stream, state) {
					if(stream.sol()) {
						checkForNewText();
					}
					
					addNewTokens(state, tokens);
					
					if(state.currentTokens.length > 0) {
						return applyTokens(stream, state);
					}
					
					// Advance the stream and state pointers until we hit a token.
					for(stream.pos++, state.index++; stream.pos < stream.string.length; stream.pos++ && state.index++) {
						if(tokens[state.index] != null) {
							return null;
						}
					}
					// We hit the end of the stream without finding a token, advance index for new line
					eol(state);
					return null;
				},

				indent: function(state, textAfter) {
					return 0; // We don't indent as we currently have no way of asking the grammar about indentation.
				},
				
				// This is used by hinter to provide hints for the grammar.
				getGrammar: function() {
					return ometaGrammar.createInstance();
				},
				prependText: function() {
					if(mode.hasOwnProperty('prependText')) {
						return mode.prependText();
					}
					return '';
				}
			};
		});

		if(mimeType != null) {
			CodeMirror.defineMIME(mimeType, modeName);
		}
	};
});
define(['codemirror'], function() {
	return function(ometaGrammar, modeName, mimeType) {
		var getGrammar = function() {
				var grammar = ometaGrammar.createInstance();
				grammar._enableTokens();
				return grammar;
			},
			removeOldTokens = function(state) {
				for(var i = 0; i < state.currentTokens.length; i++) {
					if(state.currentTokens[i][0] <= state.index) {
						state.currentTokens.splice(i, 1);
						i--;
					}
				}
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
			var previousText = '',
				tokens = [],
				checkForNewText = function(state) {
					var ometaEditor = mode.getOMetaEditor();
					if(ometaEditor == null) {
						return;
					}
					var text = ometaEditor.getValue();
					if(text != previousText) {
						previousText = text;
						var grammar = getGrammar();
						try {
							grammar.matchAll(text, 'Process');
						}
						catch(e) {
							console.error(e, e.stack);
						}
						tokens = grammar._getTokens();
						// Backtrack if we are now covered by a token
						// Advance the stream and state pointers until we hit a token.
						for(var i = state.index - 1; i >= 0; i--) {
							if(tokens[i] != null) {
								state.currentTokens = tokens[i];
								delete tokens[i];
							}
						}
					}
				},
				eol = function(state) {
					checkForNewText(state);
					if(tokens[state.index]) {
						state.currentTokens = state.currentTokens.concat(tokens[state.index]);
						delete tokens[state.index];
					}
					state.index++;
				},
				applyTokens = function(stream, state) {
					var startPos = stream.pos;
					if(stream.eatSpace()) {
						state.index += stream.pos - startPos;
						return null;
					}
					var token = getNextToken(state);
					var totalAdvanceDistance = token[0] - state.index;
					var advanceDistance = stream.string.length - stream.pos;
					advanceDistance = Math.min(advanceDistance, totalAdvanceDistance);
					stream.pos += advanceDistance;
					state.index += advanceDistance;
					if(stream.eol()) {
						// Advance index for new line
						eol(state);
					}
					return modeName + '-' + token[1];
				};
			return {
				copyState: function(state) {
					return {
						index: state.index,
						currentTokens: state.currentTokens
					};
				},
				
				startState: function() {
					return {
						index: 0,
						currentTokens: []
					};
				},
				
				compareStates: function(origState, newState) {
					return false;
				},
				
				blankLine: eol,

				token: function(stream, state) {
					if(stream.sol()) {
						checkForNewText(state);
					}
					if(tokens[state.index]) {
						state.currentTokens = state.currentTokens.concat(tokens[state.index]);
						delete tokens[state.index];
					}
					
					removeOldTokens(state);
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
					return 0; //We don't indent SBVR
				}
				
			};
		});

		if(mimeType != null) {
			CodeMirror.defineMIME(mimeType, modeName);
		}
	}
});
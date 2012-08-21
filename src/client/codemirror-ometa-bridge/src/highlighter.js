define(['codemirror'], function() {
	return function(ometaGrammar, modeName, mimeType) {
		var getGrammar = function() {
				var grammar = ometaGrammar.createInstance();
				grammar._enableTokens();
				return grammar;
			},
			getLongestToken = function(tokens) {
				var token = tokens[0];
				for(var i = 1; i < tokens.length; i++) {
					if(tokens[i][0] > token[0]) {
						token = tokens[i];
					}
				}
				return token;
			};
		CodeMirror.defineMode(modeName, function(config, mode) {
			var previousText = '',
				tokens = [],
				eol = function(state) {
					if(tokens[state.index] && state.nextToken == null) {
						state.nextToken = getLongestToken(tokens[state.index]);
						delete tokens[state.index];
					}
					state.index++;
				},
				applyToken = function(token, stream, state) {
					var startPos = stream.pos;
					if(stream.eatSpace()) {
						state.index += stream.pos - startPos;
						state.nextToken = token;
						return null;
					}
					var totalAdvanceDistance = token[0] - state.index;
					var advanceDistance = stream.string.length - stream.pos;
					if(advanceDistance + 1 < totalAdvanceDistance) {
						state.nextToken = token;
					}
					else {
						state.nextToken = null;
					}
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
						nextToken: state.nextToken
					};
				},
				
				startState: function() {
					return {
						index: 0,
						nextToken: null
					};
				},
				
				compareStates: function(origState, newState) {
					return false;
				},
				
				blankLine: eol,

				token: function(stream, state) {
					if(stream.sol()) { //Reset most of the state because it's a new line.
						var text = mode.getOMetaEditor().getValue();
						if(text != previousText) {
							previousText = text;
							var grammar = getGrammar();
							try {
								grammar.matchAll(text, 'Process');
							}
							catch(e) {}
							tokens = grammar._getTokens();
							// Backtrack if we are now covered by a token
							// Advance the stream and state pointers until we hit a token.
							for(var i = state.index; i >= 0; i--) {
								if(tokens[i] != null) {
									var token = getLongestToken(tokens[i]);
									delete tokens[i];
									if(token[0] > state.index) {
										state.nextToken = token;
									}
								}
							}
						}
					}
					if(state.nextToken != null) {
						return applyToken(state.nextToken, stream, state);;
					}
					if(tokens[state.index]) {
						var currTokens = tokens[state.index];
						delete tokens[state.index];
						return applyToken(getLongestToken(currTokens), stream, state);
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
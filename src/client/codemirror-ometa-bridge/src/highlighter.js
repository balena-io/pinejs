define(['codemirror'], function() {
	return function(ometaGrammar, modeName, mimeType) {
		var getGrammar = function() {
			var grammar = ometaGrammar.createInstance();
			grammar._enableTokens();
			return grammar;
		};
		CodeMirror.defineMode(modeName, function(config, mode) {
			var applyToken = function(token, stream, state) {
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
				return modeName + '-' + token[1];
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
			return {
				copyState: function(state) {
					return {
						shared: state.shared,
						index: state.index,
						nextToken: state.nextToken
					};
				},
				
				startState: function() {
					return {
						// We use an object for shared so that the reference can be the same for all states.
						shared: {
							text: '',
							tokens: []
						},
						index: 0,
						nextToken: null
					};
				},
				
				compareStates: function(origState, newState) {
					return false;
				},
				
				blankLine: function(state) {
					state.index++;
					if(state.shared.tokens[state.index] && state.nextToken == null) {
						state.nextToken = getLongestToken(state.shared.tokens[state.index]);
						delete state.shared.tokens[state.index];
					}
				},

				token: function(stream, state) {
					if(stream.sol()) { //Reset most of the state because it's a new line.
						var text = mode.getOMetaEditor().getValue();
						if(text != state.shared.text) {
							state.shared.text = text;
							var grammar = getGrammar();
							try {
								grammar.matchAll(state.shared.text, 'Process');
							}
							catch(e) {}
							state.shared.tokens = grammar._getTokens();
						}
						else {
							this.blankLine(state);
						}
					}
					if(state.nextToken != null) {
						return applyToken(state.nextToken, stream, state);;
					}
					if(state.shared.tokens[state.index]) {
						var currTokens = state.shared.tokens[state.index];
						delete state.shared.tokens[state.index];
						return applyToken(getLongestToken(currTokens), stream, state);
					}
					
					// Advance the stream and state pointers until we hit a token.
					for(stream.pos++, state.index++; stream.pos < stream.string.length; stream.pos++ && state.index++) {
						if(state.shared.tokens[state.index] != null) {
							return null;
						}
					}
					// We hit the end of the stream without finding a token
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
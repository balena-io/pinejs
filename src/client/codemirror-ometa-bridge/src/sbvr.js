define(['sbvr-parser/SBVRParser', 'codemirror'], function(SBVRParser) {
	requireCSS('codemirror-ometa-bridge');
	CodeMirror.defineMode("sbvr", function(config) {

		return {
			copyState: function(state) {
				return {
					tokens: state.tokens,
					nextToken: state.nextToken,
					grammar: state.grammar.clone()
				};
			},
		
			startState: function(grammar) {
				if(grammar == undefined) {
					grammar = SBVRParser.createInstance();
					grammar._enableTokens();
				}
				return {
					tokens: [],
					nextToken: null,
					grammar: grammar
				};
			},
			
			compareStates: function(origState, newState) {
				return origState.grammar.equals(newState.grammar);
			},
			
			blankLine: function(state) {
				state.tokens = [];
				state.nextToken = null;
			},

			token: function(stream, state) {
				if(stream.sol()) { //Reset most of the state because it's a new line.
					try {
						this.blankLine(state);
						state.grammar.matchAll(stream.string,'line');
					}
					catch(e) {}
					state.tokens = state.grammar._getTokens();
				}
				if(state.nextToken != null) {
					var nextToken = state.nextToken;
					state.nextToken = null;
					stream.pos = nextToken[0];
					return "sbvr-"+nextToken[1];
				}
				if(state.tokens[stream.pos]) {
					var currTokens = state.tokens[stream.pos];
					delete state.tokens[stream.pos];
					for (var i in currTokens) {
						if(stream.eatSpace()) {
							state.nextToken = currTokens[i];
							return null;
						}
						stream.pos = currTokens[i][0];
						return "sbvr-"+currTokens[i][1];
					}
				}
				for(var i = stream.pos + 1; i < state.tokens.length; i++) {
					if(state.tokens[i] != null) {
						stream.pos = i;
						return null;
					}
				}
				stream.skipToEnd();
				return null;
			},

			indent: function(state, textAfter) {
				return 0; //We don't indent SBVR
			}
			
		};
	});

	CodeMirror.defineMIME("text/sbvr", "sbvr");
});
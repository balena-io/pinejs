CodeMirror.defineMode("sbvr", function(config) {

	return {
		copyState: function(state) {
			return $.extend(true,{},state);
		},
	
		startState: function(base) {
			return SBVRParser.createInstance();
		},
		
		compareStates: function(origState, newState) {
			return origState.equals(newState);
		},
		
		blankLine: function(state) {
			state._tokens = [];
			state.__possibilities = [];
		},

		token: function(stream, state) {
			if(stream.sol()) { //Reset most of the state because it's a new line.
				try {
					this.blankLine(state);
					state.matchAll(stream.string,'line');
				}
				catch(e) {}
			}
			if(state.nextToken != undefined && state.nextToken != null) {
				var nextToken = state.nextToken;
				state.nextToken = null;
				stream.pos = nextToken[0];
				return "sbvr-"+nextToken[1];
			}
			if(state._tokens[stream.pos]) {
				var currTokens = state._tokens[stream.pos];
				delete state._tokens[stream.pos];
				for (var i in currTokens) {
					if(state.keyTokens.indexOf(currTokens[i][1])!=-1) {
						if(stream.eatSpace()) {
							state.nextToken = currTokens[i];
							return null;
						}
						stream.pos = currTokens[i][0];
						return "sbvr-"+currTokens[i][1];
					}
				}
			}
			for(var i in state._tokens) {
				if(isNaN(parseInt(i))) {
					stream.skipToEnd();
					return null;
				}
				if(i>stream.pos) {
					stream.pos = i;
					return null;
				}
			}
		},

		indent: function(state, textAfter) {
			return 0; //We don't indent SBVR
		}
		
	};
});

CodeMirror.defineMIME("text/sbvr", "sbvr");
CodeMirror.defineMode("sbvr", function(config) {

	return {
		startState: function(base) {
			return SBVRParser.createInstance();
		},

		token: function(stream, state) {
			if(stream.sol()) { //Reset most of the state because it's a new line.
				try {
					state._tokens = [];
					state.__possibilities = [];
					state.matchAll(stream.string,'line');
					console.log(state);
				}
				catch(e) {
					console.log(e);
					console.log(state);
//					stream.skipToEnd();
//					return null;
				}
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
				stream.pos = i;
				return null;
			}
		},

		indent: function(state, textAfter) {
			return 0; //We don't indent SBVR
		}
	};
});

CodeMirror.defineMIME("text/sbvr", "sbvr");
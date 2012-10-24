define(['codemirror-ometa-bridge/highlighter', 'ometa!sbvr-parser/SBVRParser', 'underscore'], function(codeMirrorOmetaBridgeHighlighter, SBVRParser) {
	codeMirrorOmetaBridgeHighlighter(SBVRParser, 'sbvr', 'text/sbvr');
});

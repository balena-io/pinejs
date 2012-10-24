define(['codemirror-ometa-bridge/highlighter', 'ometa!sbvr-parser/SBVRParser', 'css!./sbvr'], function(codeMirrorOmetaBridgeHighlighter, SBVRParser) {
	codeMirrorOmetaBridgeHighlighter(SBVRParser, 'sbvr', 'text/sbvr');
});

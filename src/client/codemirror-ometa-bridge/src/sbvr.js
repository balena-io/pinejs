define(['sbvr-parser/SBVRParser', 'codemirror-ometa-bridge/highlighter'], function(SBVRParser, codeMirrorOmetaBridgeHighlighter) {
	requireCSS('codemirror-ometa-bridge/sbvr');
	codeMirrorOmetaBridgeHighlighter(SBVRParser, 'sbvr', 'text/sbvr');
});
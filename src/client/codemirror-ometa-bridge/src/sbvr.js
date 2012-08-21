define(['codemirror-ometa-bridge/highlighter', 'sbvr-parser/SBVRParser'], function(codeMirrorOmetaBridgeHighlighter, SBVRParser) {
	requireCSS('codemirror-ometa-bridge/sbvr');
	codeMirrorOmetaBridgeHighlighter(SBVRParser, 'sbvr', 'text/sbvr');
});
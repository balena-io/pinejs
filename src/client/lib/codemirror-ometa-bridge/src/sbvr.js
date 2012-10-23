define(['codemirror-ometa-bridge/highlighter', 'ometa!sbvr-parser/SBVRParser', 'requirecss', 'underscore'], function(codeMirrorOmetaBridgeHighlighter, SBVRParser) {
	requireCSS('codemirror-ometa-bridge/sbvr');
	codeMirrorOmetaBridgeHighlighter(SBVRParser, 'sbvr', 'text/sbvr');
});

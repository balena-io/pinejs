define(['codemirror-ometa-bridge/highlighter', 'ometa-compiler', 'css!./ometa'], function(codeMirrorOmetaBridgeHighlighter) {
	codeMirrorOmetaBridgeHighlighter(BSOMetaJSParser, 'ometa', 'text/ometa');
});

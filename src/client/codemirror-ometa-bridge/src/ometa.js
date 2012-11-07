define(['codemirror-ometa-bridge/highlighter', 'ometa-compiler'], function(codeMirrorOmetaBridgeHighlighter) {
	requireCSS('codemirror-ometa-bridge/ometa');
	codeMirrorOmetaBridgeHighlighter(BSOMetaJSParser, 'ometa', 'text/ometa', {disableReusingMemoizations: true});
});
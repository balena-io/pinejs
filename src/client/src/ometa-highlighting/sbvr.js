define(['codemirror-ometa/highlighter', 'cs!extended-sbvr-parser', 'css!./sbvr'], function(codeMirrorOmetaHighlighter, SBVRParser) {
	codeMirrorOmetaHighlighter(SBVRParser, 'sbvr', 'text/sbvr');
});

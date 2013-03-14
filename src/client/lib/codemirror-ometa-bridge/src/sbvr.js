define(['codemirror-ometa/highlighter', 'ometa!sbvr-parser/SBVRParser', 'css!./sbvr'], function(codeMirrorOmetaHighlighter, SBVRParser) {
	codeMirrorOmetaHighlighter(SBVRParser, 'sbvr', 'text/sbvr');
});

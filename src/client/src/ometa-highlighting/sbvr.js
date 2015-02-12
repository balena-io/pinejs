define(['codemirror-ometa/highlighter', 'extended-sbvr-parser', './sbvr.css'], function(codeMirrorOmetaHighlighter, SBVRParser) {
	codeMirrorOmetaHighlighter(SBVRParser, 'sbvr', 'text/sbvr', {enableLineByLineParsing: true});
});

define([
	'codemirror-ometa-highlighter',
	'codemirror',
	'jquery',
	'uglifyjs',
	'bootstrap',
	'codemirror-javascript',
	'ometajs!ometa-src/bs-ometa-optimizer',
	'ometajs!ometa-src/bs-ometa-compiler',
	'ometajs!ometa-src/bs-js-compiler',
	'ometajs!ometa-src/bs-ometa-js-compiler'], function(codeMirrorOmetaHighlighter, CodeMirror, $, uglify) {
	// Highlight directly from the parsers we just compiled from source.
	codeMirrorOmetaHighlighter(BSOMetaJSParser, 'ometajs', 'text/ometajs', {disableReusingMemoizations: true});
	$('#tabs').tab();
	var ometaEditor = CodeMirror.fromTextArea($('#ometaEditor')[0], {
		mode: {
			name: 'ometajs',
			getOMetaEditor: function() {
				return ometaEditor;
			}
		}
	}),
	jsEditor = CodeMirror.fromTextArea($('#jsEditor')[0], {
		mode: 'javascript'
	}),
	compressor = uglify.Compressor({
		sequences: false,
		unused: false // We need this off for OMeta
	});
	$('a#jsNav').on('shown', function (e) {
		var tree = ometaEditor.getMode().fullParse(),
			js = BSOMetaJSTranslator.match(tree, "trans"),
			ast = uglify.parse(js);
		ast.figure_out_scope();
		ast = ast.transform(compressor);
		js = ast.print_to_string({
			beautify: true
		});
		jsEditor.setValue(js);
	});
});
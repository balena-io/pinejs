define(['cache', 'ometa-compiler', 'uglifyjs'], function (cache, OMetaCompiler, UglifyJS) {
	'use strict';
	var compressor = UglifyJS.Compressor({
		sequences: false,
		unused: false // We need this off for OMeta
	}),
	parseError = function(matchingError, index) {
		var line = 1,
			column = 0,
			i = 0,
			char,
			start;
		for(; i < index; i++) {
			char = source.charAt(i);
			column++;
			if(char == '\n') {
				line++;
				column = 0;
			}
		}
		console.error('Error on line ' + line + ', column ' + column);
		start = Math.max(0, index - 20);
		console.error('Error around: ' + source.substring(start, Math.min(source.length, start + 40)));
		console.error('Error around: ' + source.substring(index - 2, Math.min(source.length, index + 2)));
		throw matchingError;
	},
	compileOMeta = function (s) {
		var tree = OMetaCompiler.BSOMetaJSParser.matchAll(s, "topLevel", undefined, parseError),
			js = OMetaCompiler.BSOMetaJSTranslator.match(tree, "trans"),
			ast = UglifyJS.parse(js);
		ast.figure_out_scope();
		ast = ast.transform(compressor);
		js = ast.print_to_string({
			beautify: true
		});
		return js;
	};
	return cache(function(source) {
		return compileOMeta(source);
	}, function(name, parentRequire) {
		return parentRequire.toUrl(name + '.ometa');
	});
});

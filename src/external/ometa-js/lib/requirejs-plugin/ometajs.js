define(['cache', 'ometa-parsers', 'uglifyjs'], function (cache, OMetaCompiler, UglifyJS) {
	'use strict';
	var compressor = UglifyJS.Compressor({
		sequences: false,
		unused: false // We need this off for OMeta
	}),
	parseError = function(instance, err) {
		var source = instance.input.lst,
			idx = err.OMeta.idx,
			start = Math.max(0, idx - 20);
		console.log('Error on line ' + err.OMeta.line + ', column ' + err.OMeta.col);
		console.log('Error around: ' + source.substring(start, Math.min(source.length, start + 40)));
		console.log('Error around: ' + source.substring(idx - 2, Math.min(source.length, idx + 2)));
		throw err;
	},
	compileOMeta = function (source) {
		var tree = OMetaCompiler.BSOMetaJSParser.matchAll(source, "topLevel", undefined, parseError),
			js = OMetaCompiler.BSOMetaJSTranslator.match(tree, "trans"),
			ast;
		if(!/(?:\s|^)define(?:\s*)\(/.test(js)) {
			// If there is no explicit define statement then redirect exports to the window object.
			js = 'var exports = exports || window;' + js;
		}
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
		return parentRequire.toUrl(name + '.ometajs');
	});
});

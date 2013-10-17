define(['cache', 'coffee-script'], function (cache, CoffeeScript) {
	'use strict';
	var compile;
	if (typeof btoa !== 'undefined' && btoa !== null && typeof JSON !== 'undefined' && JSON !== null) {
		compile = function(source, config, path) {
			var code,
				options = config.CoffeeScript || {};
			options.sourceMap = true;
			options.inline = true;
			options.sourceFiles = [path];
			code = CoffeeScript.compile(source, options);
			return code.js + '\n//@ sourceMappingURL=data:application/json;base64,' + btoa(code.v3SourceMap);
		};
	}
	else {
		compile = function(source, config) {
			return CoffeeScript.compile(source, config.CoffeeScript);
		};
	}
	return cache(compile, function(name, parentRequire) {
		return parentRequire.toUrl(name + '.coffee');
	}, CoffeeScript.VERSION);
});

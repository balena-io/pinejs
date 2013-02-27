define(['cache', 'coffee-script'], function (cache, CoffeeScript) {
	'use strict';
	return cache(function(source, config) {
		return CoffeeScript.compile(source, config.CoffeeScript);
	}, function(name, parentRequire) {
		return parentRequire.toUrl(name + '.coffee');
	});
});

/*jslint */
/*global define, window, XMLHttpRequest, importScripts,
	ActiveXObject, process, require */

define(function () {
	'use strict';
	var fs, getXhr, sessionStorage,
		fetchText = function () {
			throw new Error('Environment unsupported.');
		},
		buildMap = {};

	if (typeof process !== "undefined" &&
			process.versions &&
			!!process.versions.node) {
		//Using special require.nodeRequire, something added by r.js.
		fs = require.nodeRequire('fs');
		fetchText = function (path, callback) {
			callback(fs.readFileSync(path, 'utf8'));
		};
	} else if ((typeof window !== "undefined" && window.navigator && window.document) || typeof importScripts !== "undefined") {
		// Browser action
		getXhr = function () {
			//Would love to dump the ActiveX crap in here. Need IE 6 to die first.
			var xhr, i, progId, progIds;
			if (typeof XMLHttpRequest !== "undefined") {
				return new XMLHttpRequest();
			} else {
				for (i = 0; i < 3; i++) {
					progId = progIds[i];
					try {
						xhr = new ActiveXObject(progId);
					} catch (e) {}

					if (xhr) {
						progIds = [progId]; // so faster next time
						break;
					}
				}
			}

			if (!xhr) {
				throw new Error("getXhr(): XMLHttpRequest not available");
			}

			return xhr;
		};

		fetchText = function (url, callback) {
			var xhr = getXhr();
			xhr.open('GET', url, true);
			xhr.onreadystatechange = function () {
				//Do not explicitly handle errors, those should be
				//visible via console output in the browser.
				if (xhr.readyState === 4) {
					callback(xhr.responseText);
				}
			};
			xhr.send(null);
		};
		// end browser.js adapters
	}

	if (typeof window !== 'undefined' && window.sessionStorage !== 'undefined') {
		sessionStorage = window.sessionStorage;
	}
	else {
		var db = null;
		try {
			db = JSON.parse(fs.readFileSync(".cache.json", "utf8"));
		} catch (e) {
			db = {};
		}
		sessionStorage = {
			getItem: function (key) {
				return db[key] || false;
			},
			setItem: function (key, value) {
				db[key] = value;
				fs.writeFileSync(".cache.json", JSON.stringify(db));
			}
		};
	}

	return function(compile, resolvePath, version) {
		return {
			write: function (pluginName, name, write) {
				if (buildMap.hasOwnProperty(name)) {
					var text = buildMap[name];
					write.asModule(pluginName + "!" + name, text);
				}
			},
	
			version: version,
	
			load: function (name, parentRequire, load, config) {
				if(parentRequire.toUrl(name) == 'empty:') {
					load.fromText('');
					return;
				}
				var path = resolvePath(name, parentRequire);
				fetchText(path, function (source) {
					var cached = sessionStorage.getItem(path);
					if (cached) {
						cached = JSON.parse(cached);
					} else {
						cached = {};
					}
	
					var compiled = cached.compiled;
					if (cached.source !== source || cached.version !== version || version === false) {
						console.log("Compiling", path.split('/').pop());
						//Run compilation.
						try {
							compiled = compile(source, config, path, parentRequire, finishLoading);
						}
						catch (err) {
							finishLoading(err);
						}
					}
					if(typeof compiled === 'string') {
						finishLoading(null, compiled);
					}

					function finishLoading(err, compiled) {
						if(err) {
							load.error("In " + path + ", " + err);
							return;
						}
						sessionStorage.setItem(path, JSON.stringify({
							version: version,
							compiled: compiled,
							source: source
						}));

						//Hold on to the transformed text if a build.
						if (config.isBuild) {
							buildMap[name] = compiled;
						}
		
						//IE with conditional comments on cannot handle the
						//sourceURL trick, so skip it if enabled.
						/*@if (@_jscript) @else @*/
						if (!config.isBuild) {
							compiled += "\n//@ sourceURL=" + path + '.js';
						}
						/*@end@*/
		
						//Have RequireJS execute the JavaScript within
						//the correct environment/context, and trigger the load
						//call for this resource.
						load.fromText(compiled);
					};
				});
			}
		};
	};
});

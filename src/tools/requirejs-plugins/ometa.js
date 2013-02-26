/**
 * @license cs 0.4.2 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/require-cs for details
 */

/*jslint */
/*global define, window, XMLHttpRequest, importScripts, Packages, java,
  ActiveXObject, process, require */
define(['ometa-core', 'ometa-compiler', 'uglifyjs'], function (OMeta, OMetaCompiler, UglifyJS) {
	'use strict';
	var fs, getXhr, sessionStorage,
		fetchText = function () {
			throw new Error('Environment unsupported.');
		},
		buildMap = {},
		compressor = UglifyJS.Compressor({
			sequences: false,
			unused: false // We need this off for OMeta
		});

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
			var xhr, i, progId;
			if (typeof XMLHttpRequest !== "undefined") {
				return new XMLHttpRequest();
			} else {
				for (i = 0; i < 3; i++) {
					progId = progIds[i];
					try {
						xhr = new ActiveXObject(progId);
					} catch (e) {}

					if (xhr) {
						progIds = [progId];  // so faster next time
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
			xhr.onreadystatechange = function (evt) {
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
		sessionStorage = {
			getItem: function () {return false;},
			setItem: function () {return false;},
		};
	}

	return {
		get: function () {
			return OMeta;
		},

		write: function (pluginName, name, write) {
			if (buildMap.hasOwnProperty(name)) {
				var text = buildMap[name];
				write.asModule(pluginName + "!" + name, text);
			}
		},

		version: '0.4.2',

		load: function (name, parentRequire, load, config) {
			if(parentRequire.toUrl(name) == 'empty:') {
				load.fromText('');
				return;
			}
			var path = parentRequire.toUrl(name + '.ometa');
			fetchText(path, function (source) {

				var compileOMeta = function (s) {
					var tree = OMetaCompiler.BSOMetaJSParser.matchAll(s, "topLevel", undefined, function(matchingError, index) {
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
						}),
						js = OMetaCompiler.BSOMetaJSTranslator.match(tree, "trans"),
						ast = UglifyJS.parse(js);
					ast.figure_out_scope();
					ast = ast.transform(compressor);
					js = ast.print_to_string({
						beautify: true
					});
					return js;
				}

				var cached = sessionStorage.getItem(path);
				if (cached) {
					cached = JSON.parse(cached);
				} else {
					cached = {}
				}

				var compiled = cached.compiled;
				if (cached.source !== source) {
					console.log("Compiling", path.split('/').pop());
					//Do OMeta transform.
					try {
						compiled = compileOMeta(source);
					}
					catch (err) {
						err.message = "In " + path + ", " + err.message;
						throw(err);
					}
					sessionStorage.setItem(path, JSON.stringify({
						compiled: compiled,
						source: source
					}));
				}

				//Hold on to the transformed text if a build.
				if (config.isBuild) {
					buildMap[name] = compiled;
				}

				//IE with conditional comments on cannot handle the
				//sourceURL trick, so skip it if enabled.
				/*@if (@_jscript) @else @*/
				if (!config.isBuild) {
					compiled += "\r\n//@ sourceURL=" + path;
				}
				/*@end@*/

				//Have RequireJS execute the JavaScript within
				//the correct environment/context, and trigger the load
				//call for this resource.
				load.fromText(compiled);
			});
		}
	};
});

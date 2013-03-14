/*
 * grunt-contrib-ometajs
 * http://gruntjs.com/
 *
 * Copyright (c) 2012 Eric Woroshow, contributors
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
	'use strict';

	grunt.registerMultiTask('ometajs', 'Compile OMetaJS files into JavaScript', function() {
		var options = this.options({
			separator: grunt.util.linefeed
		});

		grunt.verbose.writeflags(options, 'Options');

		this.files.forEach(function(f) {
			var output = f.src.filter(function(filepath) {
				// Warn on and remove invalid source files (if nonull was set).
				if (!grunt.file.exists(filepath)) {
					grunt.log.warn('Source file "' + filepath + '" not found.');
					return false;
				} else {
					return true;
				}
			}).map(function(filepath) {
				return compileOMetaJS(filepath, options);
			}).join(grunt.util.normalizelf(options.separator));

			if (output.length < 1) {
				grunt.log.warn('Destination not written because compiled files were empty.');
			} else {
				grunt.file.write(f.dest, output);
				grunt.log.writeln('File ' + f.dest + ' created.');
			}
		});
	});

	var compileOMetaJS = function(srcFile, options) {
		var srcCode = grunt.file.read(srcFile);

		try {
			return require('../lib/ometajs/api').compile(srcCode, options);
		} catch (e) {
			grunt.log.error(e);
			grunt.fail.warn('OMetaJS failed to compile.');
		}
	};
};
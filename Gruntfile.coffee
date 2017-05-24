webpack = require 'webpack'
_ = require 'lodash'

serverConfigs =
	'browser': require './build/browser'
	'module': require './build/module'
	'server': require './build/server'

for task, config of serverConfigs
	config.plugins.push(
		new webpack.optimize.UglifyJsPlugin(
			output:
				beautify: true
				ascii_only: true
			compress:
				sequences: false
				unused: false # We need this off for OMeta
			mangle: false
		)
	)

module.exports = (grunt) ->
	grunt.initConfig
		clean: ['out']

		checkDependencies:
			this:
				options:
					packageManager: 'npm'
					# TODO: Enable when grunt-check-dependencies works correctly with deduped packages.
					# onlySpecified: true

		concat:
			_.mapValues serverConfigs, (config, task) ->
				defines = _.find(config.plugins, (plugin) -> plugin.definitions?).definitions
				return {
					options:
						banner: """
							/*! Build: #{task} - <%= grunt.option('version') %>
							Defines: #{JSON.stringify(defines, null, '\t')}
							*/
						"""
					src: ['out/pine.js']
					dest: 'out/pine.js'
				}

		copy:
			prepublish:
				files: [
					expand: true
					cwd: 'src'
					src: [ '**' ]
					dest: 'out/'
					filter: (filename) ->
						not _.endsWith(filename, '.coffee') and not _.endsWith(filename, '.ts')
				]

		gitinfo:
			commands:
				describe: ['describe', '--tags', '--always', '--long', '--dirty']

		rename: do ->
			renames = {}
			for task, config of serverConfigs
				renames[task] =
					src: 'out/pine.js'
					dest: "out/pine-#{task}-<%= grunt.option('version') %>.js"
				renames["#{task}.map"] =
					src: 'out/pine.js.map'
					dest: "out/pine-#{task}-<%= grunt.option('version') %>.js.map"
			return renames

		replace:
			_.extend
				'pine.js':
					src: 'out/pine.js'
					overwrite: true
					replacements: [
						from: /nodeRequire/g
						to: 'require'
					]
				_.mapValues serverConfigs, (v, task) ->
					src: 'out/pine.js'
					overwrite: true
					replacements: [
						from: /sourceMappingURL=pine.js.map/g
						to: "sourceMappingURL=pine-#{task}-<%= grunt.option('version') %>.js.map"
					]

		webpack: serverConfigs

		coffee:
			prepublish:
				options:
					sourceMap: true
					header: true
				expand: true
				cwd: 'src'
				src: [ '**/*.coffee' ]
				dest: 'out'
				ext: '.js'

		ts:
			prepublish:
				tsconfig: true
				expand: true

	require('load-grunt-tasks')(grunt)

	grunt.registerTask 'version', ->
		grunt.task.requires('gitinfo:describe')
		grunt.option('version', grunt.config.get('gitinfo.describe'))


	for task of serverConfigs
		grunt.registerTask task, [
			'checkDependencies'
			'webpack:' + task
			'gitinfo:describe'
			'version'
			'replace:pine.js'
			"replace:#{task}"
			"concat:#{task}"
			"rename:#{task}"
			"rename:#{task}.map"
		]

	grunt.registerTask 'prepublish', [
		'checkDependencies'
		'clean'
		'copy:prepublish'
		'coffee:prepublish'
		'ts:prepublish'
	]

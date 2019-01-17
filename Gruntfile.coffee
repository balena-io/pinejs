_ = require 'lodash'
UglifyJsPlugin = require 'uglifyjs-webpack-plugin'

serverConfigs =
	'browser': require './build/browser'
	'module': require './build/module'
	'server': require './build/server'

for task, config of serverConfigs
	config.plugins.push(
		new UglifyJsPlugin(
			uglifyOptions:
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
		clean:
			default:
				src: [ "<%= grunt.option('target') %>" ]
				options:
					force: true

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
			default:
				files: [
					expand: true
					cwd: 'src'
					src: [ '**' ]
					dest: "<%= grunt.option('target') %>"
					filter: (filename) ->
						_.endsWith(filename, '.d.ts') or (not _.endsWith(filename, '.coffee') and not _.endsWith(filename, '.ts'))
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
			default:
				options:
					sourceMap: true
					header: true
				expand: true
				cwd: 'src'
				src: [ '**/*.coffee' ]
				dest: "<%= grunt.option('target') %>"
				ext: '.js'

		ts:
			default:
				tsconfig: true
				options:
					additionalFlags: "--outDir <%= grunt.option('target') %> --resolveJsonModule"


	require('load-grunt-tasks')(grunt)

	if not grunt.option('target')
		grunt.option('target', 'out/')

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

	grunt.registerTask 'build', [
		'clean'
		'checkDependencies'
		'coffee'
		'ts'
		'copy'
	]

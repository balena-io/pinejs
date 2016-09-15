webpack = require 'webpack'
_ = require 'lodash'

clientConfigs =
	'client': require './src/client/build/client'
	'client-server': require './src/client/build/client-server'
	'ddui': require './src/client/build/ddui'
	'sbvr.co': require './src/client/build/sbvr.co'
serverConfigs =
	'browser': require './src/server/build/browser'
	'module': require './src/server/build/module'
	'server': require './src/server/build/server'

clientDevConfigs = {}
for task, config of clientConfigs
	clientDevConfigs[task] = _.clone(config)
	clientDevConfigs[task].plugins = _.clone(config.plugins)
	config.plugins = config.plugins.concat(
		new webpack.optimize.UglifyJsPlugin(
			compress:
				unused: false # We need this off for OMeta
		)
	)

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
			client:
				files: [
					expand: true
					cwd: 'src/client/src/static'
					src: '**'
					dest: 'out/static'
				]

		gitinfo:
			commands:
				describe: ['describe', '--tags', '--always', '--long', '--dirty']

		htmlmin:
			client:
				options:
					removeComments: true
					removeCommentsFromCDATA: true
					collapseWhitespace: false
				files: [
					src: 'src/client/src/index.html'
					dest: 'out/index.html'
				]

		imagemin:
			client:
				options:
					optimizationLevel: 3
				files: [
					expand: true
					cwd: 'out/static/'
					src: '*'
					dest: 'out/static/'
				]

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

		webpack: _.extend({}, clientConfigs, serverConfigs)
		'webpack-dev-server':
			_.mapValues clientDevConfigs, (config) ->
				keepAlive: true
				contentBase: 'src/client/src/'
				webpack: config

	require('load-grunt-tasks')(grunt)

	grunt.registerTask 'version', ->
		grunt.task.requires('gitinfo:describe')
		grunt.option('version', grunt.config.get('gitinfo.describe'))

	for task of clientConfigs
		grunt.registerTask task, [
			'copy:client'
			'imagemin:client'
			'htmlmin:client'
			'webpack:' + task
		]

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

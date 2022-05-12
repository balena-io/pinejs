import type * as Grunt from 'grunt';
import type { WebpackPluginInstance } from 'webpack';

import * as _ from 'lodash';
import * as TerserPlugin from 'terser-webpack-plugin';
import * as browserConfig from './build/browser';
import * as moduleConfig from './build/module';
import * as serverConfig from './build/server';

const serverConfigs = {
	browser: browserConfig,
	module: moduleConfig,
	server: serverConfig,
};

_.forEach(serverConfigs, (config) => {
	config.optimization = {
		minimizer: [
			new TerserPlugin({
				parallel: true,
				terserOptions: {
					output: {
						beautify: true,
						ascii_only: true,
					},
					compress: {
						sequences: false,
						unused: false, // We need this off for OMeta
					},
					mangle: false,
				},
			}),
		],
	};
});

export = (grunt: typeof Grunt) => {
	grunt.initConfig({
		clean: {
			default: {
				src: [`<%= grunt.option('target') %>`],
				options: {
					force: true,
				},
			},
		},

		checkDependencies: {
			this: {
				options: {
					packageManager: 'npm',
					// TODO: Enable when grunt-check-dependencies works correctly with deduped packages.
					// onlySpecified: true
				},
			},
		},

		concat: _.mapValues(serverConfigs, (config, task) => {
			const defines = (
				config.plugins as Array<WebpackPluginInstance & { definitions?: {} }>
			).find((plugin) => plugin.definitions != null)!.definitions;
			return {
				options: {
					banner: `
							/*! Build: ${task} - <%= grunt.option('version') %>
							Defines: ${JSON.stringify(defines, null, '\t')}
							*/
						`,
				},
				src: ['out/pine.js'],
				dest: 'out/pine.js',
			};
		}),

		copy: {
			default: {
				files: [
					{
						expand: true,
						cwd: 'src',
						src: ['**'],
						dest: `<%= grunt.option('target') %>`,
						filter: (filename: string) =>
							filename.endsWith('.d.ts') || !filename.endsWith('.ts'),
					},
				],
			},
		},

		gitinfo: {
			commands: {
				describe: ['describe', '--tags', '--always', '--long', '--dirty'],
			},
		},

		rename: (() => {
			const renames: _.Dictionary<{ src: string; dest: string }> = {};
			_.forEach(serverConfigs, (_config, task) => {
				renames[task] = {
					src: 'out/pine.js',
					dest: `out/pine-${task}-<%= grunt.option('version') %>.js`,
				};
				renames[`${task}.map`] = {
					src: 'out/pine.js.map',
					dest: `out/pine-${task}-<%= grunt.option('version') %>.js.map`,
				};
			});
			return renames;
		})(),

		replace: {
			'pine.js': {
				src: 'out/pine.js',
				overwrite: true,
				replacements: [
					{
						from: /nodeRequire/g,
						to: 'require',
					},
				],
			},
			..._.mapValues(serverConfigs, (_config, task) => {
				return {
					src: 'out/pine.js',
					overwrite: true,
					replacements: [
						{
							from: /sourceMappingURL=pine.js.map/g,
							to: `sourceMappingURL=pine-${task}-<%= grunt.option('version') %>.js.map`,
						},
					],
				};
			}),
		},

		webpack: serverConfigs,

		ts: {
			default: {
				tsconfig: {
					passThrough: true,
				},
				options: {
					additionalFlags: `--outDir <%= grunt.option('target') %>`,
				},
			},
		},
	});

	require('load-grunt-tasks')(grunt);

	if (!grunt.option('target')) {
		grunt.option('target', 'out/');
	}

	grunt.registerTask('version', function () {
		this.requires('gitinfo:describe');
		grunt.option('version', grunt.config.get('gitinfo.describe'));
	});

	for (const task of Object.keys(serverConfigs)) {
		grunt.registerTask(task, [
			'checkDependencies',
			'webpack:' + task,
			'gitinfo:describe',
			'version',
			'replace:pine.js',
			`replace:${task}`,
			`concat:${task}`,
			`rename:${task}`,
			`rename:${task}.map`,
		]);
	}

	grunt.registerTask('build', ['clean', 'checkDependencies', 'ts', 'copy']);
};

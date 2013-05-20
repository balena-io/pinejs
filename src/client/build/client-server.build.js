({
	dir: '../out',
	stubModules: [
		'cache',
		'text',
		'css', 'css/normalize', 'css/css',
		'cs', 'coffee-script',
		'ometa', 'ometa-parsers', 'uglifyjs'
	],
	mainConfigFile: '../src/main.js',
	optimize: 'uglify2',
	skipDirOptimize: true,
	uglify2: {
		compress: {
			unused: false // We need this off for OMeta
		}
	},

	separateCSS: true,
	modules: [
		{
			name: "main",
			include: [
				'cs!views/tabs/sbvr-editor/main',
				'cs!views/tabs/sbvr-lf/main',
				'cs!views/tabs/sbvr-graph/main',
				'cs!views/tabs/sbvr-server/main',
				'cs!views/tabs/ddui/main',
				'cs!views/tabs/db-import-export/main',
				'cs!views/tabs/validate/main',

				'cs!server-glue/server'
			]
		}
	],

	has: {
		// To enable the in-browser server
		ENV_BROWSER: true
	}
})

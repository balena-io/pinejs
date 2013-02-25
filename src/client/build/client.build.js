({
	dir: '../out',
	stubModules: [
		'cs',
		'text',
		'css', 'css/normalize', 'css/css',
		'ometa', 'ometa-compiler', 'js-beautify',
		'coffee-script'],
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
			name: "main"
		}
	],

	has: {
		// For the in-browser server
		ENV_BROWSER: false
	},
	paths: {
		// For the in-browser server
		"server-glue/server": "empty:"
	}
})

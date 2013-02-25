({
	dir: '../out',
	stubModules: [
		'cs',
		'text',
		'css', 'css/normalize', 'css/css',
		'ometa', 'ometa-compiler', 'uglifyjs',
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
		// To disable the in-browser server
		ENV_BROWSER: false
	},
	paths: {
		// To stop the in-browser server code being compiled in
		"server-glue/server": "empty:"
	}
})

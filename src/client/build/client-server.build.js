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
			name: "main",
			include: ['cs!server-glue/server']
		}
	],
	
	has: {
		// To enable the in-browser server
		ENV_BROWSER: true
	}
})

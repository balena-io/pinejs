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
		output: {
			beautify: true,
			ascii_only: true
		},
		compress: {
			sequences: false,
			unused: false // We need this off for OMeta
		},
		mangle: false
	},

	has: {
		BROWSER_SERVER_ENABLED: false
	},
	separateCSS: true,
	modules: [
		{
			name: "main"
		}
	],
	
	paths: {
		"server-glue/server": "empty:"
	}
})

({
	dir: '../out',
	stubModules: ['cs', 'text', 'ometa', 'css'],
	mainConfigFile: '../src/main.js',
	optimize: 'uglify2',
	uglify2: {
		compress: {
			unused: false // We need this off for OMeta
		}
	},
	separateCSS: true,
	modules: [
		{
			name: "main",
			exclude: ['coffee-script']
		}
	]
})

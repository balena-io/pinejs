({
	dir: '../out',
	stubModules: ['cs', 'text', 'ometa', 'css'],
	mainConfigFile: '../src/main.js',
	optimize: 'uglify2',
	separateCSS: true,
	modules: [
		{
			name: "main",
			exclude: ['coffee-script']
		}
	]
})

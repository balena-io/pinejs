({
	appDir: '../src',
	dir: '../out',
	stubModules: ['cs', 'text', 'ometa', 'css'],
	mainConfigFile: '../src/main.js',
	optimize: 'uglify',
	separateCSS: true,
	modules: [
		{
			name: "main",
			exclude: ['coffee-script']
		}
	]
})

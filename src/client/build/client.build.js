({
    appDir: '../src',
    dir: '../out',
    stubModules: ['cs', 'text', 'ometa', 'css'],
    mainConfigFile: '../src/scripts/main.js',
    optimize: 'none',
    separateCSS: true,
    modules: [
    	{
			name: "main",
			exclude: ['coffee-script']
		}
    ]
})

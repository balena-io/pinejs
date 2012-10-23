({
    appDir: '../src',
    dir: '../out',
    stubModules: ['cs', 'text', 'ometa'],
    mainConfigFile: '../src/main.js',
    modules: [
    	{
			name: "../main",
			exclude: ['coffee-script']
		}
    ]
})

({
	out: 'out.js',
	wrap: {
		start: "(function() { var define = require('requirejs').define;",
		end: "}());"
	},

	stubModules: ['cs', 'text', 'ometa'],
	mainConfigFile: '../src/main.js',

	optimize: 'uglify',
	uglify: {
		toplevel: true,
		ascii_only: true,
		max_line_length: 1000,
	},

	has: {
		ENV_NODEJS			  :  true,
		SBVR_SERVER_ENABLED	 :  true,
		EDITOR_SERVER_ENABLED   :  true,
		BROWSER_SERVER_ENABLED  :  false,
		USE_MYSQL			   :  true,
		USE_POSTGRES			:  false,
		DEV					 :  true
	},

	paths: {
		underscore: 'empty:',
		async: 'empty:'
	},
	name: "main",
	exclude: ["coffee-script"]
})

({
	out: 'platform.js',
	wrap: {
		start: "(function() { var define = require('requirejs').define;",
		end: "}());require('requirejs')('cs!server-glue/server');"
	},

	stubModules: [
		'text',
		'css', 
		'cs',
		'ometa'
	],
	excludeShallow: [
		'coffee-script',
		'css/normalize', 'css/css',
		'ometa-compiler', 'uglifyjs'
	],
	mainConfigFile: '../src/main.js',

	optimize: 'uglify2',
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
		ENV_NODEJS				: true,
		ENV_BROWSER				: false,
		SBVR_EXTENSIONS			: true,
		SBVR_SERVER_ENABLED		: false,
		USE_MYSQL				: true,
		USE_POSTGRES			: false,
		DEV						: false,

		CONFIG_LOADER			: true
	},

	paths: {
		underscore: 'empty:',
		async: 'empty:'
	},
	name: 'cs!server-glue/server'
})

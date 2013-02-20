({
	out: 'platform.js',

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
		ENV_NODEJS				: false,
		SBVR_EXTENSIONS			: true,
		SBVR_SERVER_ENABLED		: true,
		BROWSER_SERVER_ENABLED	: true,
		USE_MYSQL				: false,
		USE_POSTGRES			: false,
		DEV						: true,

		CONFIG_LOADER			: false
	},

	paths: {
		underscore: '../node_modules/underscore/underscore',
		async: '../node_modules/async/lib/async'
	},

	name: "cs!server-glue/server",
	exclude: ['coffee-script', 'cs', 'text', 'ometa', 'ometa-compiler'],
})

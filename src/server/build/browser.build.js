({
	out: 'platform.js',

	stubModules: ['cs', 'text', 'ometa', 'ometa-compiler'],
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
		EDITOR_SERVER_ENABLED	: false,
		BROWSER_SERVER_ENABLED	: true,
		USE_MYSQL				: false,
		USE_POSTGRES			: false,
		DEV						: false,

		CONFIG_LOADER			: true
	},

	paths: {
		underscore: '../node_modules/underscore/underscore',
		async: '../node_modules/async/lib/async'
	},

	name: "cs!server-glue/server",
	exclude: ["coffee-script"]
})

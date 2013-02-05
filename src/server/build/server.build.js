({
	out: 'platform.js',
	wrap: {
		start: "(function() { var define = require('requirejs').define;",
		end: "}());require('requirejs')('cs!server-glue/server');"
	},

	stubModules: ['cs', 'text', 'ometa', 'ometa-compiler'],
	mainConfigFile: '../src/main.js',

	optimize: 'uglify',
	uglify: {
		make_seqs: false,
		ascii_only: true,
		beautify: true,
		no_mangle: true
	},

	has: {
		ENV_NODEJS				: true,
		SBVR_EXTENSIONS			: true,
		SBVR_SERVER_ENABLED		: false,
		EDITOR_SERVER_ENABLED	: false,
		BROWSER_SERVER_ENABLED	: false,
		USE_MYSQL				: true,
		USE_POSTGRES			: false,
		DEV						: false,

		CONFIG_LOADER			: true,

		UNDERCURRENT			: false
	},

	paths: {
		underscore: 'empty:',
		async: 'empty:'
	},
	name: "cs!server-glue/server",
	exclude: ["coffee-script"]
})

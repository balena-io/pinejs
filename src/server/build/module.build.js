({
	out: function(text) {
		nodeRequire(this.baseUrl + '../build/postprocess.js').call(this, text);
	},
	wrap: {
		start: "(function() { var define = require('requirejs').define;",
		end: "}());module.exports = require('requirejs')('cs!server-glue/module');"
	},

	stubModules: [
		'text',
		'css',
		'cs',
		'ometa'
	],
	excludeShallow: [
		'cache',
		'coffee-script',
		'css/normalize', 'css/css',
		'ometa-parsers', 'uglify-js'
	],
	preserveLicenseComments: false,
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
		DEV						: false,

		CONFIG_LOADER			: true
	},

	paths: {
		lodash: 'empty:',
		bluebird: 'empty:',
		'typed-error': 'empty:'
	},
	name: 'cs!server-glue/module'
})

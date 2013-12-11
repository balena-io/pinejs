({
	out: function(text) {
		nodeRequire(this.baseUrl + '../build/postprocess.js').call(this, text);
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
		ENV_NODEJS				: false,
		ENV_BROWSER				: true,
		SBVR_EXTENSIONS			: true,
		SBVR_SERVER_ENABLED		: true,
		DEV						: true,

		CONFIG_LOADER			: false
	},

	paths: {
		underscore: '../../underscore/underscore'
	},

	name: 'cs!server-glue/server'
})

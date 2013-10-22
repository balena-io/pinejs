require = require('requirejs')

require({
	config: {
		has: {
			ENV_NODEJS				: true,
			ENV_BROWSER				: false,
			SBVR_EXTENSIONS			: true,
			SBVR_SERVER_ENABLED		: true,
			DEV						: true,

			CONFIG_LOADER			: false
		}
	},
	paths: {
		//Developing & building tools
		'cache'					: '../../client/lib/require-cache/cache',
		'cs'					: '../../client/lib/require-cs/cs',
		'ometa'					: '../../../node_modules/ometa-js/lib/requirejs-plugin/ometajs',
		'text'					: '../../tools/requirejs-plugins/text',
		'coffee-script'			: '../../client/lib/coffee-script/extras/coffee-script',
		'has'					: '../../tools/has',

		'ometa-parsers'			: '../../../node_modules/ometa-js/lib/ometajs/ometa/parsers',
		'uglify-js'				: '../../external/uglifyjs/uglify',

		//Libraries
		'ometa-core'			: '../../../node_modules/ometa-js/lib/ometajs/core',
		'OMeta'					: '../../../node_modules/ometa-js/lib/ometajs/core',
		'utils'					: '../../common/utils',
		'prettify'				: '../../common/prettify',
		'odata-parser'			: '../../../node_modules/odata-parser/odata-parser',
		'odata-to-abstract-sql'	: '../../../node_modules/odata-to-abstract-sql/odata-to-abstract-sql'
	},
	packages: [
		{
			name: 'sbvr-parser',
			location: '../../../node_modules/sbvr-parser',
			main: 'sbvr-parser'
		},
		{
			name: 'extended-sbvr-parser',
			location: '../../common/extended-sbvr-parser',
			main: 'extended-sbvr-parser'
		},
		{
			name: 'lf-to-abstract-sql',
			location: '../../../node_modules/lf-to-abstract-sql',
			main: 'index'
		},
		{
			name: 'abstract-sql-compiler',
			location: '../../../node_modules/abstract-sql-compiler',
			main: 'index'
		}
	],
	shim: {
		'uglify-js': {
			exports: 'UglifyJS'
		},
		'sbvr-parser': {
			deps: ['sbvr-parser/sbvr-libs', 'sbvr-parser/inflection']
		}
	}
}, ['cs!server-glue/server']);

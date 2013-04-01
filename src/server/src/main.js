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
		'cache'					: '../../tools/requirejs-plugins/cache',
		'cs'					: '../../tools/requirejs-plugins/cs',
		'ometa'					: '../../../node_modules/ometa-js/lib/requirejs-plugin/ometajs',
		'text'					: '../../tools/requirejs-plugins/text',
		'coffee-script'			: '../../tools/coffee-script',
		'has'					: '../../tools/has',

		'ometa-parsers'			: '../../../node_modules/ometa-js/lib/ometajs/ometa/parsers',
		'uglifyjs'				: '../../external/uglifyjs/uglify',

		//Libraries
		'ometa-core'			: '../../../node_modules/ometa-js/lib/ometajs/core',
		'OMeta'					: '../../../node_modules/ometa-js/lib/ometajs/core',
		'sbvr-parser'			: '../../common/sbvr-parser',
		'utils'					: '../../common/utils',
		'prettify'				: '../../common/prettify',
		'inflection'			: '../../external/inflection/inflection',
		'odata-parser'			: '../../../node_modules/odata-parser/odata-parser',
		'odata-to-abstract-sql'	: '../../../node_modules/odata-to-abstract-sql/odata-to-abstract-sql'
	},
	shim: {
		'uglifyjs': {
			exports: 'UglifyJS'
		}
	}
}, ['cs!server-glue/server']);

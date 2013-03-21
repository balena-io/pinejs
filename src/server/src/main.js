require = require('requirejs')

require({
	config: {
		has: {
			ENV_NODEJS				: true,
			ENV_BROWSER				: false,
			SBVR_EXTENSIONS			: true,
			SBVR_SERVER_ENABLED		: true,
			USE_MYSQL				: true,
			USE_POSTGRES			: false,
			DEV						: true,

			CONFIG_LOADER			: false
		}
	},
	paths: {
		//Developing & building tools
		'cache'				:  '../../tools/requirejs-plugins/cache',
		'cs'				:  '../../tools/requirejs-plugins/cs',
		'ometa'				:  '../../external/ometa-js/lib/requirejs-plugin/ometajs',
		'text'				:  '../../tools/requirejs-plugins/text',
		'coffee-script'		:  '../../tools/coffee-script',
		'has'				:  '../../tools/has',

		'ometa-parsers'	:  '../../external/ometa-js/lib/ometajs/ometa/parsers',
		'uglifyjs'			: '../../external/uglifyjs/uglify',

		//Libraries
		'ometa-core'		:  '../../external/ometa-js/lib/ometajs/core',
		'OMeta'				:  '../../external/ometa-js/lib/ometajs/core',
		'sbvr-parser'		:  '../../common/sbvr-parser',
		'utils'				:  '../../common/utils',
		'prettify'			:  '../../common/prettify',
		'inflection'		:  '../../external/inflection/inflection',
	},
	shim: {
		'uglifyjs': {
			exports: 'UglifyJS'
		}
	}
}, ['cs!server-glue/server']);

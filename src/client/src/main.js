require({
	config: {
		has: {
			SBVR_EXTENSIONS: true,
			
			// For the in-browser server
			ENV_NODEJS				: false,
			ENV_BROWSER				: true,
			SBVR_SERVER_ENABLED		: true,
			DEV						: true,

			CONFIG_LOADER			: false
		}
	},
	paths: {
		//Developing & building tools
		'cache'						: '../../tools/requirejs-plugins/cache',
		'cs'						: '../../tools/requirejs-plugins/cs',
		'ometa'						: '../../../node_modules/ometa-js/lib/requirejs-plugin/ometajs',
		'text'						: '../../tools/requirejs-plugins/text',
		'coffee-script'				: '../../tools/coffee-script',
		'has'						: '../../tools/has',

		'lib'						: '../lib',

		'ometa-parsers'				: '../../../node_modules/ometa-js/lib/ometajs/ometa/parsers',
		'uglifyjs'					: '../../external/uglifyjs/uglify',

		//Libraries
		'async'						: '../../external/async/async.min',
		'backbone'					: '../lib/backbone',
		'bootstrap'					: '../lib/bootstrap/bootstrap',
		'codemirror'				: '../lib/codemirror/lib/codemirror',
		'codemirror-modes'			: '../lib/codemirror/mode',
		'ometa-highlighting'		: '../lib/codemirror-ometa-bridge/src',
		'codemirror-ometa'			: '../../../node_modules/ometa-js/lib/codemirror-ometa',
		'codemirror-simple-hint'	: '../lib/codemirror/addon/hint/simple-hint',
		'd3'						: '../lib/d3.v2',
		'inflection'				: '../../external/inflection/inflection',
		'jquery'					: '../lib/jquery',
		'jquery-xdomain'			: '../lib/jquery-xdomain',
		'ometa-core'				: '../../../node_modules/ometa-js/lib/ometajs/core',
		'sbvr-parser'				: '../../common/sbvr-parser',
		'lodash'					: '../lib/lodash.compat',
		'ejs'						: '../lib/ejs',
		'jquery-ui'					: '../lib/jquery-ui',
		
		// For the in-browser server
		'odata-parser'				: '../../../node_modules/odata-parser/odata-parser',
		'odata-to-abstract-sql'		: '../../../node_modules/odata-to-abstract-sql/odata-to-abstract-sql',
		'config-loader'				: '../../server/src/config-loader',
		'database-layer'			: '../../server/src/database-layer',
		'data-server'				: '../../server/src/data-server',
		'express-emulator'			: '../../server/src/express-emulator',
		'passport-bcrypt'			: '../../server/src/passport-bcrypt',
		'server-glue'				: '../../server/src/server-glue',
		'sbvr-compiler'				: '../../server/src/sbvr-compiler',
		'prettify'					: '../../common/prettify'
	},
	packages: [
		{
			name: 'css',
			location: '../../tools/requirejs-plugins/css',
			main: 'css'
		}
	],
	shim: {
		'bootstrap': {
			deps: ['jquery', 'css!lib/bootstrap/bootstrap']
		},
		'css!static/main': {
			deps: ['bootstrap'],
		},
		'codemirror-simple-hint': {
			deps: ['codemirror', 'css!lib/codemirror/addon/hint/simple-hint']
		},
		'codemirror': {
			deps: [ 'css!lib/codemirror/lib/codemirror'],
			exports: 'CodeMirror'
		},
		'codemirror-modes/sql/sql': ['codemirror'],
		'jquery-ui': {
			deps: ['jquery']
		},
		'jquery-xdomain': {
			deps: ['jquery']
		},
		'd3': {
			exports: 'd3'
		},
		'backbone': {
			deps: ['lodash', 'jquery-xdomain'],
			exports: 'Backbone',
			init: function () {
				return this.Backbone.noConflict();
			}
		},
		'uglifyjs': {
			exports: 'UglifyJS'
		},
		'async': {
			exports: 'async'
		}
	}
}, ['cs!app', 'css!static/main']);

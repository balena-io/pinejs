require({
	config: {
		has: {
			SBVR_EXTENSIONS: true
		}
	},
	paths: {
		//Developing & building tools
		'cs'						: '../tools/requirejs-plugins/cs',
		'ometa'						: '../tools/requirejs-plugins/ometa',
		'text'						: '../tools/requirejs-plugins/text',
		'coffee-script'				: '../tools/coffee-script',
		'has'						: '../../tools/has',

		'lib'						: '../lib',

		'ometa-compiler'			: '../../external/ometa-js/lib/ometajs/ometa/parsers',
		'js-beautify'				: '../../external/beautify/beautify',

		//Libraries
		'async'						: '../../external/async/async.min',
		'backbone'					: '../lib/backbone',
		'bootstrap'					: '../lib/bootstrap/bootstrap',
		'codemirror'				: '../lib/codemirror/lib/codemirror',
		'codemirror-ometa-bridge'	: '../lib/codemirror-ometa-bridge/src',
		'codemirror-simple-hint'	: '../lib/codemirror/addon/hint/simple-hint',
		'd3'						: '../lib/d3.v2',
		'inflection'				: '../../external/inflection/inflection',
		'jquery'					: '../lib/jquery',
		'jquery-xdomain'			: '../lib/jquery-xdomain',
		'ometa-core'				: '../../external/ometa-js/lib/ometajs/core',
		'sbvr-parser'				: '../../common/sbvr-parser',
		'underscore'				: '../lib/underscore',
		'ejs'						: '../lib/ejs',
		'jquery-ui'					: '../lib/jquery-ui',
		
		// For the in-browser server
		'config-loader'				: '../../server/src/config-loader',
		'database-layer'			: '../../server/src/database-layer',
		'data-server'				: '../../server/src/data-server',
		'express-emulator'			: '../../server/src/express-emulator',
		'passport-bcrypt'			: '../../server/src/passport-bcrypt',
		'server-glue'				: '../../server/src/server-glue',
		'sbvr-compiler'				: '../../server/src/sbvr-compiler',
		'Prettify'					: '../../common/Prettify',
	},
	packages: [
		{
			name: 'css',
			location: '../tools/requirejs-plugins/css',
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
			deps: ['underscore', 'jquery-xdomain'],
			exports: 'Backbone',
			init: function () {
				return this.Backbone.noConflict();
			}
		},
		'underscore': {
			exports: '_',
			init: function () {
				return this._.noConflict();
			}
		},
		'js-beautify': {
			exports: 'js_beautify'
		},
		'async': {
			exports: 'async'
		}
	},

	// For the in-browser server
	has: {
		ENV_NODEJS				: false,
		SBVR_EXTENSIONS			: true,
		SBVR_SERVER_ENABLED		: true,
		EDITOR_SERVER_ENABLED	: false,
		BROWSER_SERVER_ENABLED	: true,
		USE_MYSQL				: false,
		USE_POSTGRES			: false,
		DEV						: true,

		CONFIG_LOADER			: false
	}
}, ['cs!app', 'css!static/main']);

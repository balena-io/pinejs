require({
	config: {
		has: {
			TAB_SBVR_EDITOR			: true,
			TAB_SBVR_LF				: true,
			TAB_SBVR_GRAPH			: true,
			TAB_SBVR_SERVER			: true,
			TAB_DDUI				: true,
			TAB_DB_IMPORT_EXPORT	: true,
			TAB_VALIDATE			: true,

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
		'cache'						: '../../client/lib/require-cache/cache',
		'cs'						: '../../client/lib/require-cs/cs',
		'ometa'						: '../../../node_modules/ometa-js/lib/requirejs-plugin/ometajs',
		'text'						: '../../tools/requirejs-plugins/text',
		'coffee-script'				: '../../client/lib/coffee-script/extras/coffee-script',
		'has'						: '../../tools/has',

		'lib'						: '../lib',

		'ometa-parsers'				: '../../../node_modules/ometa-js/lib/ometajs/ometa/parsers',
		'uglify-js'					: '../../external/uglifyjs/uglify',

		//Libraries
		'async'						: '../../../node_modules/async/lib/async',
		'backbone'					: '../lib/backbone/backbone',
		'bootstrap'					: '../lib/bootstrap/docs/assets/js/bootstrap',
		'codemirror'				: '../lib/codemirror/lib/codemirror',
		'codemirror-modes'			: '../lib/codemirror/mode',
		'codemirror-ometa'			: '../../../node_modules/ometa-js/lib/codemirror-ometa',
		'codemirror-simple-hint'	: '../lib/codemirror/addon/hint/simple-hint',
		'd3'						: '../lib/d3/d3',
		'jquery'					: '../lib/jquery/jquery',
		'jquery-xdomain'			: '../lib/jquery-xdomain',
		'ometa-core'				: '../../../node_modules/ometa-js/lib/ometajs/core',
		'lodash'					: '../../../node_modules/lodash/dist/lodash.compat',
		'ejs'						: '../lib/ejs/ejs',
		'jquery-ui'					: '../lib/jquery-ui/ui/jquery-ui',
		
		// For the in-browser server
		'bluebird'					: '../lib/bluebird/js/browser/bluebird',
		'odata-parser'				: '../../../node_modules/odata-parser/odata-parser',
		'odata-to-abstract-sql'		: '../../../node_modules/odata-to-abstract-sql/odata-to-abstract-sql',
		'config-loader'				: '../../server/src/config-loader',
		'database-layer'			: '../../server/src/database-layer',
		'data-server'				: '../../server/src/data-server',
		'express-emulator'			: '../../server/src/express-emulator',
		'passport-bcrypt'			: '../../server/src/passport-bcrypt',
		'server-glue'				: '../../server/src/server-glue',
		'sbvr-compiler'				: '../../server/src/sbvr-compiler'
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
		},
		{
			name: 'css',
			location: '../../tools/requirejs-plugins/css',
			main: 'css'
		}
	],
	shim: {
		'bootstrap': {
			deps: ['jquery', 'css!lib/bootstrap/docs/assets/css/bootstrap']
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
		'ejs': {
			exports: 'ejs'
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
			deps: ['lodash', 'jquery-xdomain'],
			exports: 'Backbone',
			init: function () {
				return this.Backbone.noConflict();
			}
		},
		'uglify-js': {
			exports: 'UglifyJS'
		},
		'async': {
			exports: 'async'
		}
	}
}, ['cs!app', 'css!static/main']);

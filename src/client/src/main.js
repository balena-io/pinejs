require({
	baseUrl: 'scripts',
	paths: {
		//Developing & building tools
		'cs'                       :  '../../tools/requirejs-plugins/cs',
		'ometa'                    :  '../../tools/requirejs-plugins/ometa',
		'text'                     :  '../../tools/requirejs-plugins/text',
		'coffee-script'            :  '../../tools/coffee-script',

		//Libraries
		'backbone'                 :  '../../lib/backbone',
		'bootstrap'                :  '../../lib/bootstrap/bootstrap',
		'codemirror'               :  '../../lib/codemirror/codemirror',
		'codemirror-ometa-bridge'  :  '../../lib/codemirror-ometa-bridge/src',
		'codemirror-simple-hint'   :  '../../lib/codemirror/util/simple-hint',
		'inflection'               :  '../../lib/inflection/inflection',
		'jquery'                   :  '../../lib/jquery',
		'ometa-compiler'           :  '../../lib/ometajs/ometa/parsers',
		'ometa-core'               :  '../../lib/ometajs/core',
		'requirecss'               :  '../../lib/requirecss',
		'sbvr-parser'              :  '../../lib/sbvr-parser',
		'underscore'               :  '../../lib/underscore'
	},
	shim: {
		'bootstrap': ['jquery'],
		'codemirror-simple-hint': {
			deps: ['codemirror'],
		},
		'codemirror': {
			exports: 'CodeMirror'
		},
		'backbone': {
			deps: ['underscore', 'jquery'],
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
		}
	}
}, ['cs!main']);

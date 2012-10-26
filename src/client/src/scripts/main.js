require({
	baseUrl: 'scripts',
	paths: {
		//Developing & building tools
		'cs'                       :  '../../tools/requirejs-plugins/cs',
		'ometa'                    :  '../../tools/requirejs-plugins/ometa',
		'text'                     :  '../../tools/requirejs-plugins/text',
		'coffee-script'            :  '../../tools/coffee-script',

		'lib'                      :  '../../lib',
		'static'                   :  '../static',

		//Libraries
		'backbone'                 :  '../../lib/backbone',
		'bootstrap'                :  '../../lib/bootstrap/bootstrap',
		'codemirror'               :  '../../lib/codemirror/codemirror',
		'codemirror-ometa-bridge'  :  '../../lib/codemirror-ometa-bridge/src',
		'codemirror-simple-hint'   :  '../../lib/codemirror/util/simple-hint',
		'd3'                       :  '../../lib/d3.v2',
		'inflection'               :  '../../lib/inflection/inflection',
		'jquery'                   :  '../../lib/jquery',
		'ometa-compiler'           :  '../../lib/ometajs/ometa/parsers',
		'ometa-core'               :  '../../lib/ometajs/core',
		'sbvr-parser'              :  '../../lib/sbvr-parser',
		'underscore'               :  '../../lib/underscore'
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
			deps: ['codemirror', 'css!lib/codemirror/util/simple-hint']
		},
		'codemirror': {
			deps: [ 'css!lib/codemirror/codemirror'],
			exports: 'CodeMirror'
		},
		'd3': {
			exports: 'd3'
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
}, ['cs!app', 'css!static/main']);

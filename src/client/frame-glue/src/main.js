if(typeof DDUI_ENABLED === 'undefined') DDUI_ENABLED = true
if(typeof BROWSER_SERVER_ENABLED === 'undefined') BROWSER_SERVER_ENABLED = typeof process === 'undefined'

// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());

require(['underscore', 'ometa-core'], function(_) {
	console.log(_)
	if(DDUI_ENABLED) {
		require(['data-frame/drawDataUI',
				'data-frame/runTrans',
		]);
	}
	require(['data-frame/ClientURIUnparser',
			'downloadify/downloadify.min',
			'downloadify/swfobject']);
	requireCSS('codemirror');
	require(["codemirror"], function() {
		requireCSS('codemirror-util/simple-hint')
		require(["codemirror-util/simple-hint", "codemirror-keymap/vim"], function() {
			require(['codemirror-ometa-bridge/sbvr', "codemirror-ometa-bridge/hinter"]);
			require(["codemirror-modes/plsql/plsql"], function() {
				require(["frame-glue/script"]);
			})
		})
	});
	require(["sbvr-frame/SBVRModels"])
	
	if(BROWSER_SERVER_ENABLED) {
		require(["server-glue/server"]);
	}
});
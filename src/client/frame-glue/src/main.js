// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());

require(['underscore', 'ometa-core'], function(_) {
	console.log(_)
	require([/*#IFDEF server */
				"data-frame/drawDataUI",
				"data-frame/runTrans",
			/*#ENDIFDEF*/
			"data-frame/ClientURIUnparser",
			'downloadify/downloadify.min',
			'downloadify/swfobject']);
	requireCSS('codemirror');
	require(["codemirror"], function() {
		requireCSS('codemirror-util/simple-hint')
		require(["codemirror-util/simple-hint", "codemirror-keymap/vim"], function() {
			require(['codemirror-ometa-bridge/sbvr', "codemirror-ometa-bridge/hinter"]);
			/*#IFDEF server */
			require(["codemirror-modes/plsql/plsql"], function() {/*#ENDIFDEF*/
				require(["frame-glue/script"]);
			/*#IFDEF server */
			})/*#ENDIFDEF*/
		})
	});
	require(["sbvr-frame/SBVRModels"])
	
	/*#IFDEF websql */
		require(["server-glue/server"]);
	/*#ENDIFDEF*/
});
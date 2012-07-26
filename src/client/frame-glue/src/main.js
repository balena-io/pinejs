// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());

require(["ometa/ometa-base"], function() {
	require([/*#IFDEF server */
				"data-frame/drawDataUI",
				"data-frame/runTrans",
			/*#ENDIFDEF*/
			"data-frame/ClientURIUnparser",
			'downloadify/downloadify.min',
			'downloadify/swfobject']);
	require(["inflection",
			"sbvr-parser/SBVRParser"], function() {
		requireCSS('codemirror');
		require(["codemirror"], function() {
			requireCSS('codemirror-util/simple-hint.css')
			require(["codemirror-util/simple-hint", "codemirror-keymap/vim"], function() {
				require(["codemirror-ometa-bridge/sbvr","codemirror-ometa-bridge/sbvrac"]);
				/*#IFDEF server */
				require(["codemirror-modes/plsql/plsql"], function() {/*#ENDIFDEF*/
					require(["script"]);
				/*#IFDEF server */
				})/*#ENDIFDEF*/
			})
		});
		require(["sbvr-frame/SBVRModels"])
	});
	
	/*#IFDEF websql */
		require(["server-glue"]);
	/*#ENDIFDEF*/
});
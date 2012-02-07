// make it safe to use console.log always
(function(b){function c(){}for(var d="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,timeStamp,profile,profileEnd,time,timeEnd,trace,warn".split(","),a;a=d.pop();){b[a]=b[a]||c}})((function(){try
{console.log();return window.console;}catch(err){return window.console={};}})());

require(["ometa-base"], function() {
	require(["libs/json2",
			/*#IFDEF server */
				"data-frame/drawDataUI",
				"data-frame/runTrans",
			/*#ENDIFDEF*/
			"data-frame/ClientURIParser",
			"data-frame/ClientURIUnparser"]);
	require(["inflection",
			"SBVRParser",
			"mylibs/ometa-code/Prettify"], function() {
		require(["codemirror"], function() {
			require(["../CodeMirror2/lib/util/simple-hint"], function() {
				require(["mylibs/cm/sbvr","mylibs/cm/sbvrac"]);
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
		require(["libs/json2",
				"mylibs/server"]);
	/*#ENDIFDEF*/
});
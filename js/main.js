require(["../ometa-js/lib",
		"../ometa-js/ometa-base"], function() {
	require(["libs/json2",
			/*#IFDEF server */
				"mylibs/drawDataUI",,
				"mylibs/runTrans"
			/*#ENDIFDEF*/
			"mylibs/ometa-code/ClientURIParser",
			"mylibs/ometa-code/ClientURIUnparser"]);
	require(["libs/inflection",
			"mylibs/ometa-code/SBVRParser",
			"mylibs/ometa-code/Prettify"], function() {
		require(["../CodeMirror2/lib/codemirror"], function() {
			require(["mylibs/cm/sbvr","mylibs/cm/sbvrac"]);
			/*#IFDEF server */
			require(["../CodeMirror2/mode/plsql/plsql"], function() {/*#ENDIFDEF*/
				require(["script"]);
			/*#IFDEF server */
			})/*#ENDIFDEF*/
		});
		require(["mylibs/ometa-code/SBVRModels"])
	});
	
	/*#IFDEF websql */
		require(["libs/json2",
				"mylibs/server"]);
	/*#ENDIFDEF*/
});
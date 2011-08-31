require(["../ometa-js/lib",
		"../ometa-js/ometa-base"], function() {
	require(["mylibs/json2",
			"mylibs/drawDataUI",
			"mylibs/ometa-code/ClientURIParser",
			"mylibs/ometa-code/ClientURIUnparser"]);
	require(["mylibs/inflection",
			"mylibs/ometa-code/SBVRParser",
			"mylibs/ometa-code/Prettify"], function() {
		require(["../CodeMirror2/lib/codemirror"], function() {
			require(["mylibs/cm/sbvr","mylibs/cm/sbvrac"]);
			/*#IFDEF SERVER */
			require(["../CodeMirror2/mode/plsql/plsql"], function() {/*#ENDIFDEF*/
				require(["script"]);
			/*#IFDEF SERVER */
			})/*#ENDIFDEF*/
		});
		require(["mylibs/ometa-code/SBVRModels"])
	});
	
	/*#IFDEF SERVER */
		require(["mylibs/json2",
				"mylibs/ometa-code/SBVRParser",
				"mylibs/ometa-code/SBVR_PreProc",
				"mylibs/ometa-code/SBVR2SQL",
				"mylibs/ometa-code/ServerURIParser",
				"mylibs/server",
				"mylibs/runTrans",
				"mylibs/backupRestore"]);
	/*#ENDIFDEF*/
});
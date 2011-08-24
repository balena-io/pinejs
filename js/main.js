require(["../ometa-js/lib",
		"../ometa-js/ometa-base"], function() {
	require(["mylibs/json2",
			"mylibs/drawDataUI",
			"mylibs/ometa-code/ClientURIParser",
			"mylibs/ometa-code/ClientURIUnparser"]);
	require(["mylibs/inflection",
			"mylibs/ometa-code/SBVRParser"], function() {
		require(["../CodeMirror2/lib/codemirror"], function() {
			require(["mylibs/cm/sbvr","mylibs/cm/sbvrac"]);
			require(["../CodeMirror2/mode/plsql/plsql"], function() {
				require(["script"]);
			})
		});
		require(["mylibs/ometa-code/SBVRModels"])
	});
	
	require(["mylibs/json2",
			"mylibs/ometa-code/SBVRParser",
			"mylibs/ometa-code/SBVR_PreProc",
			"mylibs/ometa-code/SBVR2SQL",
			"mylibs/ometa-code/ServerURIParser",
			"mylibs/ometa-code/Prettify",
			"mylibs/server",
			"mylibs/runTrans"]);
});
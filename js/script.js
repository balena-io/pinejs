/* Author: 

*/


var sqlEditor, sbvrEditor, lfEditor, importExportEditor;
var cmod;

function defaultFailureCallback(statusCode, error) {
	if(error == undefined || error == null) {
		error = [statusCode];
	}
	console.log(error);
	var exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
	var msg = error['status-line']?error['status-line']:error.join('<br/>');
	$( "#dialog-message" ).html( exc + msg );
	$( "#dialog-message" ).dialog( "open" );
	//console.log("fail!", error);
}

function defaultSuccessCallback(statusCode, result, headers) {
}

//should probably JSON.parse result when appropriate. Now the callbacks do it.
function serverRequest(method, uri, headers, body, successCallback, failureCallback){
	$("#httpTable").append(
		'<tr class="server_row"><td><strong>' + method +
		"</strong></td><td>" + uri + "</td><td>" + (headers.length==0?'':headers) +
		"</td><td>" + body + "</td></tr>"
	);
	if(typeof remoteServerRequest=='function')
		remoteServerRequest(method, uri, headers, body,
			typeof successCallback != 'function' ? defaultSuccessCallback : successCallback,
			typeof failureCallback != 'function' ? defaultFailureCallback : failureCallback);
}

//txtmod = '';
function loadState() {
	serverRequest("GET", "/onAir/", [], '', function(statusCode, result){
		if(result!=undefined){
			localStorage._client_onAir = JSON.parse(result);
		}
	});
}

function transformClient(model) {
	$("#modelArea").attr('disabled',true);
	//TODO: Add success/failure callbacks.
	serverRequest("PUT",
		"/ui/textarea-is_disabled*filt:textarea.name=model_area/",
		{"Content-Type":"application/json"},
		JSON.stringify({"value":true}),
		function() {
		
			serverRequest("PUT",
				"/ui/textarea*filt:name=model_area/",
				{"Content-Type":"application/json"},
				JSON.stringify({"value":model}),
				function() {

					serverRequest("POST",
						"/execute/",
						{"Content-Type":"application/json"},
						'',
						function() {
				
							//serverRequest("GET", "/model/", [], '', function(statusCode, result, headers){
							//	txtmod = result;
							//});
						
							serverRequest("GET",
								"/lfmodel/",
								{},
								'',
								function(statusCode, result) {
									lfEditor.setValue(Prettify.match(JSON.parse(result),'elem'));

									serverRequest("GET",
										"/prepmodel/",
										{},
										'',
										function(statusCode, result) {
											$("#prepArea").val(Prettify.match(JSON.parse(result),'elem'));
											
											serverRequest("GET",
												"/sqlmodel/",
												{},
												'',
												function(statusCode, result) {
													sqlEditor.setValue(Prettify.match(JSON.parse(result),'elem'));
	
													localStorage._client_onAir='true'
													
													$('#bum').removeAttr('disabled');
													$('#br').removeAttr('disabled');
													$('#bem').attr('disabled','disabled');
												}
											);
										}
									);
								}
							);
						}
					);
				}
			);
		}
	);
}

function updateModel(){
	return true;
}

function resetClient(){
	//**actions should go in the callback to be executed after the DELETE.
	serverRequest("DELETE",	"/", [], '', function(){
		$("#modelArea").attr('disabled', false);
		sbvrEditor.setValue("");
		lfEditor.setValue("");
		$("#prepArea").val("");
		sqlEditor.setValue("");
		$('#bem').removeAttr('disabled');
		$('#bum').attr('disabled','disabled');
		$('#br').attr('disabled','disabled');
		localStorage._client_onAir=false;
	});
}

function loadmod(model){
	sbvrEditor.setValue(model);
}

function processHash(){
	theHash = location.hash
	if(theHash == ''){
		theHash = '#!/model'
	}
	
	if(theHash.slice(1,9) == '!/server'){
		URItree = [[],[[],['server']]];
	}else{
		URItree = ClientURIParser.matchAll(theHash, 'expr'); //does not handle empty tree
	}
	
	try {
		switchVal = URItree[1][1][0];
	}
	catch($e) {
		switchVal = '';
	}
	
	switch(switchVal) {
		case "server":
			//console.log(location.hash.slice(9));
			uri = location.hash.slice(9);
			serverRequest("GET", uri, "", {}, function(statusCode, result){
				alert(result);
			});
			break;
		case "sql":
			$('#tabs').tabs("select",3);
			sqlEditor.refresh(); //Force a refresh on switching to the tab, otherwise it wasn't appearing.
			break;
		case "data":
			if(localStorage._client_onAir=='true'){
				$('#tabs').tabs("select",4);
				drawData(URItree[1]);
			} else {
				var exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
				var msg = 'The data tab is only accessible after a model is executed<br/>';
				$( "#dialog-message" ).html( exc + msg );
				$( "#dialog-message" ).dialog( "open" );
			}
			break;
		case "http":
			$('#tabs').tabs("select",5);
			break;
		case "export":
			$('#tabs').tabs("select",6);
			break;
//					case "model": //Model is the default view.
		case "lf":
			break;
		case "preplf":
			break;
		default:
			sbvrEditor.refresh();
			$('#tabs').tabs("select",0);
			break;
	}
}

//break loadUI apart to loadState and SetUI (with a view to converting LoadState to a single request)?
function loadUI(){
	//request schema from server and store locally.
	if(localStorage._client_onAir=='true'){
		serverRequest("GET", "/model/", [], '', function(statusCode, result) {
			var ctree = SBVRParser.matchAll(result, 'expr');
			ctree = SBVR_PreProc.match(ctree, "optimizeTree");
			cmod = SBVR2SQL.match(ctree,'trans');
		});
	}
	
	sbvrEditor = CodeMirror.fromTextArea(document.getElementById("modelArea"), {
		mode: "sbvr",
		onKeyEvent: sbvrAutoComplete
	});
	
	lfEditor = CodeMirror.fromTextArea(document.getElementById("lfArea"));
	
	if(CodeMirror.listModes().indexOf('plsql') > -1) {
		sqlEditor = CodeMirror.fromTextArea(document.getElementById("sqlArea"), {mode: "text/x-plsql"});
		importExportEditor = CodeMirror.fromTextArea(document.getElementById("importExportArea"), {mode: "text/x-plsql"});
	}
	
	window.onhashchange = processHash;
	serverRequest("GET", "/ui/textarea*filt:name=model_area/", [], '',
		function(statusCode, result){
			sbvrEditor.setValue(JSON.parse(result).value);
		}
	)
	
	//TODO: This should be restructured to use jQuery's ajax() interface, so it can be switched
	//between local and remote as needed (preferably with some variable setting)
	//http://api.jquery.com/jQuery.ajax/
	serverRequest("GET", "/ui/textarea-is_disabled*filt:textarea.name=model_area/", [], '',
		function(statusCode, result){
			$("#modelArea").attr('disabled', JSON.parse(result).value)
		}
	)
	
	//how do we fix this? - ignore. It gets updated on execute anyway. 
	$("#modelArea").change(function(){
		serverRequest("PUT",
			"/ui/textarea*filt:name=model_area/",
			{"Content-Type":"application/json"},
			JSON.stringify({"value":sbvrEditor.getValue()})
		);
	});
	
	if(localStorage._client_onAir=='true'){
		serverRequest("GET", "/lfmodel/", [], '', function(statusCode, result){
			lfEditor.setValue(Prettify.match(JSON.parse(result),'elem'));
		});
	
		serverRequest("GET", "/prepmodel/", [], '', function(statusCode, result){
			$("#prepArea").val(Prettify.match(JSON.parse(result),'elem'));
		});
	
		serverRequest("GET", "/sqlmodel/", [], '', function(statusCode, result){
			sqlEditor.setValue(Prettify.match(JSON.parse(result),'elem'));
		});	
	}
	
	//Prepare dialog
	//$(function() {
		$( "#dialog-message" ).dialog({
			modal: true,
			resizable: false,
			autoOpen: false,
			buttons: {
				"Revise Request": function() {
					$( this ).dialog( "close" );
				},
				"Revise Model": function() {
					$( this ).dialog( "close" );
				}
			}
		});
	//});
	
	//Enable/disable model editor buttons
	if(localStorage._client_onAir=='true'){
		$('#bem').attr('disabled','disabled');
		//$('#bum').removeAttr('disabled');
		//$('#br').removeAttr('disabled');
	}else{
		$('#bum').attr('disabled','disabled');
		$('#br').attr('disabled','disabled');
		//$('#bem').removeAttr('disabled');
	}
}

//Initialise controls and shoot off the loadUI & processHash functions
$(function() {
	$("#tabs").tabs({
		select: function(event, ui) {
			//alert(ui.index != 0 && localStorage._client_onAir!='true')
			if((ui.index > 1) && (localStorage._client_onAir!='true')){
				var exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
				var msg = 'This tab is only accessible after a model is executed<br/>';
				$( "#dialog-message" ).html( exc + msg );
				$( "#dialog-message" ).dialog( "open" );
				return false;
			}else{
				switch(ui.panel.id){
					case "lfTab":
						location.hash='!/lf/'
						break;
					case "prepTab":
						location.hash='!/preplf/'
						break;
					case "sqlTab":
						location.hash='!/sql/'
						break;
					case "dataTab":
						location.hash='!/data/'
						break;
					case "httpTab":
						location.hash='!/http/'
						break;
					case "importExportTab":
						location.hash='!/export/'
						break;
					default:
						location.hash='!/model/'
						break;
				}
				return true;
			}
		}
	});
	
	loadState();
	loadUI();
	
	processHash();

	$('#bldb').file().choose(function(e, input) {
		handleFiles(input[0].files);
	});
});

function downloadFile(filename, text) {
	const MIME_TYPE = 'text/plain';
	var output = document.querySelector('output');
	window.URL = window.webkitURL || window.URL;
	window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder ||
						window.MozBlobBuilder;

	var prevLink = output.querySelector('a');
	if (prevLink) {
		window.URL.revokeObjectURL(prevLink.href);
		output.innerHTML = '';
	}

	var bb = new BlobBuilder();
	bb.append(text);

	var a = document.createElement('a');
	a.download = filename;
	a.href = window.URL.createObjectURL(bb.getBlob(MIME_TYPE));
	a.textContent = 'Download ready';

	a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');
	a.draggable = true; // Don't really need, but good practice.
	a.classList.add('dragout');

	output.appendChild(a);

	a.onclick = function(e) {
		if ('disabled' in this.dataset) {
			return false;
		}

		cleanUp(this);
	};
};
function cleanUp(a) {
	a.textContent = 'Downloaded';
	a.dataset.disabled = true;

	// Need a small delay for the revokeObjectURL to work properly.
	setTimeout(function() {
		window.URL.revokeObjectURL(a.href);
	}, 1500);
};

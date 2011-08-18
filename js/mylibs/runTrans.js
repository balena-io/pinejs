/*
Copyright 2011 University of Surrey

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

function runTrans(){
	var transuri = '';
	var trans;
	this.lockCount = 0;
	this.data = [];
	if($(".action").size()!=0){
		//fetch transaction collection location?(?) - [not needed as this is code on demand]
		//create transaction resource
		var obj = [{name:'trans'}]
		serverRequest('POST', '/data/transaction', [], JSON.stringify(obj), function(headers, result, parent){
			parent.transuri = headers.location;
			//get 'trans'action resource to extract lcURI,tlcURI,rcURI,lrcURI,xlcURI,slcURI,ctURI
			serverRequest("GET", parent.transuri, [], '', function(headers, trans, parent){
				parent.trans = JSON.parse(trans);
				//find and lock relevant resources (l,t-l,r-l)
				$(".action").each(function(index){
					switch($(this).children("#__actype").val()){
						case "editterm":
						case "editfctp":
						case "del":
							parent.lockCount++;
						default:
							break;
					}
				});
				$(".action").each(function(index){
					this.trans = parent.trans;
					this.lock;
					this.resource_id = $(this).children("#__id").val();
					this.resource_type = $(this).children("#__type").val();
					this.callback = parent.callback;
					this.parent = parent;
					lockr = new locker();
					switch($(this).children("#__actype").val()){
						case "editfctp":
						case "editterm":
							lockr.lockResource(this.resource_type, this.resource_id, this.trans, 
							function(lock_id, parent){
								cr_uri = '/data/lock*filt:lock.id=' + lock_id + '/cr';
								// make the new resource
								var inputs = $(":input:not(:submit)", parent);
								var o = $.map(inputs, function(n, i){
									if(n.id.slice(0,2)!="__"){
										var ob = {};
										ob[n.id] = $(n).val();
										return ob;
									}
								});
								//console.log(o);
								parent.callback("edit", cr_uri, o);
							}, null, this);
							break;
						case "del":
							lockr.lockResource(this.resource_type, this.resource_id, this.trans, 
							function(lock_id, parent){
								cr_uri = '/data/lock*filt:lock.id=' + lock_id + '/cr';
								parent.callback("del",cr_uri,{});
							}, null, this);
							break;
						case "addterm":
						case "addfctp":
							break;
					}
				});
			}, null, parent);
		},
		function(error){
			exc = "<span class='ui-icon ui-icon-alert' style='float:left; margin:0 7px 50px 0;'></span>";
		    msg = error.join('\n');
    	    $( '#dialog-message' ).html( exc + msg );
	        $( '#dialog-message' ).dialog( "open" );
			//console.log("fale!", error);
		}, this)
	}

	this.callback = function(op, cr_uri, o){
		this.parent.data.push([op, cr_uri, o]);
		//console.log(this.parent.data.length, this.parent.lockCount);
		if(this.parent.data.length==this.parent.lockCount){
			for(var i=0;i<this.parent.lockCount;i++){
				switch(this.parent.data[i][0]){
					case 'del':
						serverRequest("DELETE", this.parent.data[i][1], [], '', function(headers, result, parent){
							//after delete...
						}, 
						function(error){
							exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
							msg = error.join('\n');
							$( "#dialog-message" ).html( exc + msg );
							$( "#dialog-message" ).dialog( "open" );
							//console.log("fale!", error);
						}, this)
						break;
					case 'edit':
						serverRequest("PUT", this.parent.data[i][1], [], JSON.stringify(this.parent.data[i][2]), 
						function(headers, result, parent){
							//after edit...
							//console.log("succ!", result);
						}, 
						function(error){
							exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
							msg = error.join('\n');
							$( "#dialog-message" ).html( exc + msg );
							$( "#dialog-message" ).dialog( "open" );
							//console.log("fale!", error);
						}, this)
						break;
				}
			}
			//execute transaction
			serverRequest("POST", this.parent.trans.ctURI, [], '', function(headers, result, parent){
				//console.log(headers);
				location.hash = '#!/data/'
			}, 
			function(error){
				//console.log(error)
				exc = '<span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span>';
				msg = error.join('\n');
				$( "#dialog-message" ).html( exc + msg );
				$( "#dialog-message" ).dialog( "open" );
				//console.log("fale!", error);
			}, this);
		}
	}
}

function locker(){
	this.lockResource = function(resource_type, resource_id, trans, successCallback, failureCallback, caller){
		this.resource_type = resource_type;
		this.resource_id = resource_id;
		this.lock;
		this.trans = trans;
		this.caller = caller;
		this.successCallback = successCallback;
		this.failureCallback = failureCallback;
		
		serverRequest('POST', trans.lcURI, [], JSON.stringify([{'name':'lok'}]), 
		function(headers, result, parent){
			//get resulting lock to extract id and cr_uri
			serverRequest("GET", headers.location, [], '', function(headers, lock, parent){
				parent.lock = JSON.parse(lock);
				o = [{"transaction_id":parent.trans.id}, {"lock_id":parent.lock.instances[0].id}];
				//add lock to transaction
				serverRequest('POST', parent.trans.tlcURI, [], JSON.stringify(o), 
				function(headers, result, parent){
					//mark lock as exclusive
					o = [{"lock_id":parent.lock.instances[0].id}];
					//console.log(o);
					serverRequest('POST', parent.trans.xlcURI, [], JSON.stringify(o), 
					function(headers, result, parent){
						//associate lock with resource
						o = [{'resource_id':parseInt(parent.resource_id)},
							{'resource_type':parent.resource_type},
							{'lock_id':parent.lock.instances[0].id}];
						serverRequest('POST', parent.trans.lrcURI, [], JSON.stringify(o), 
						function(headers, result, parent){
							//console.log(headers,result);
							successCallback(parent.lock.instances[0].id, parent.caller);
						}, failureCallback, parent);
					}, failureCallback, parent);
				}, failureCallback, parent);
			}, failureCallback, parent);
		}, failureCallback, this);
	}
}

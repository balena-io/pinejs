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

//add a locked resource? SLock on the collection then posting on the CR of the coll which produces an XLOCKED resource?
//slock collection? lock resource with ID 0

//how do I work with conditional representations? 'lock {that is exclusive} has conditional representation'
//'Conditional Representation' has fields 'fieldname' and 'fieldvalue' and 'lock_id'
//POST .. no new id. gets stored in conditionals with a special (negative) id to be replaced with another on commit.
//PUT .. empty all previous fields and add new fields to CR
//DELETE .. empty all previous fields and add special field to CR'__delete':true

//TODO: add-transactions. Till then, reload data like so:
//INSERT INTO 'pilot' VALUES (1,'Joachim')
//INSERT INTO 'pilot' VALUES (2,'Esteban')
//INSERT INTO 'plane' VALUES (1,'Boeing 747')
//INSERT INTO 'plane' VALUES (2,'Spitfire')
//INSERT INTO 'plane' VALUES (3,'Concorde')
//INSERT INTO 'plane' VALUES (4,'Mirage 2000')
//INSERT INTO 'pilot-can_fly-plane' VALUES (1,1,2)
//INSERT INTO 'pilot-can_fly-plane' VALUES (2,1,3)
//INSERT INTO 'pilot-can_fly-plane' VALUES (3,1,4)
//INSERT INTO 'pilot-can_fly-plane' VALUES (4,2,1)
//INSERT INTO 'pilot-is_experienced' VALUES (1,1)

//This is needed as the switch has no value on first execution. Maybe there's a better way?
//be warned: localStorage stores all values as strings. 
//Hence, booleans have to be tested against their string versions.
if(!localStorage._server_onAir=='true'){localStorage._server_onAir = false}

if(localStorage._server_onAir=='true'){
	sqlmod = JSON.parse(localStorage._server_sqlmod);
	lfmod = JSON.parse(localStorage._server_lfmod);
	prepmod = JSON.parse(localStorage._server_prepmod);
	trnmod = JSON.parse(localStorage._server_trnmod);
}

//TODO: the db name needs to be changed
var db = openDatabase('mydb', '1.0', 'my first database', 2 * 1024 * 1024);

function remoteServerRequest(method, uri, headers, body, successCallback, failureCallback, caller){
	
	var op = {"eq":"=", "ne":"!=", "lk":"~"}
	var ftree = [];
	var tree = ServerURIParser.matchAll(uri, 'uri');
	if(headers!=undefined && headers["Content-Type"]=='application/xml'){
		//in case of input: do something to make xml into a json object
	}
	
	//TODO: convert this to a switch(tree[0].toLowerCase())
	if(tree[0].toLowerCase()=='onair') {
		successCallback({'status-line': 'HTTP/1.1 200 OK'}, JSON.stringify(localStorage._server_onAir));
	}else if(tree[0]=='model') {
		if(localStorage._server_onAir=='true') {
			successCallback({'status-line': 'HTTP/1.1 200 OK'}, localStorage._server_txtmod);
		}else if(failureCallback != undefined) {
			failureCallback({'status-line': 'HTTP/1.1 404 Not Found'});
		}
	}else if(tree[0]=='lfmodel') {
		if(localStorage._server_onAir=='true') {
			successCallback({'status-line': 'HTTP/1.1 200 OK'}, localStorage._server_lfmod);
		}else if(failureCallback != undefined) {
			failureCallback({'status-line': 'HTTP/1.1 404 Not Found'});
		}
	}else if(tree[0]=='prepmodel'){
		if(localStorage._server_onAir=='true') {
			successCallback({'status-line': 'HTTP/1.1 200 OK'}, localStorage._server_prepmod);
		}else if(failureCallback != undefined) {
			failureCallback({'status-line': 'HTTP/1.1 404 Not Found'});
		}
	}else if(tree[0]=='sqlmodel'){
		if(localStorage._server_onAir=='true') {
			successCallback({'status-line': 'HTTP/1.1 200 OK'}, localStorage._server_sqlmod);
		}else if(failureCallback != undefined) {
			failureCallback({'status-line': 'HTTP/1.1 404 Not Found'});
		}
	}else if(tree[0]=='ui') {
		if(tree[1][1] == 'textarea' && tree[1][3][1][1][3] == 'model_area'){
			switch(method) {
				case "PUT":
					localStorage._server_modelAreaValue = JSON.parse(body).value;
					break;
				case "GET":
					successCallback({'status-line': 'HTTP/1.1 200 OK'}, 
									JSON.stringify({"value":localStorage._server_modelAreaValue}));
			}
		} else if(tree[1][1] == 'textarea-is_disabled' && tree[1][4][1][1][3] == 'model_area') {		
			switch(method){
				case "PUT":
					localStorage._server_modelAreaDisabled = JSON.parse(body).value;
					break;
				case "GET":
					successCallback({'status-line': 'HTTP/1.1 200 OK'}, 
									JSON.stringify({"value":localStorage._server_modelAreaDisabled}));
			}
		}
	} else if(tree[0]=='execute') {
		if(method=="POST") {
			SBVRParser.terms = {} 
			SBVRParser.verbs = {}
			SBVRParser.fctps = {}
			SBVRParser.ruleVars = {}
			SBVRParser.ruleVarsCount = 0
			
			/*
			lfmod = tree = SBVRParser.matchAll(localStorage._server_modelAreaValue, 'expr');
			prepmod = tree = SBVR_PreProc.match(tree, 'optimizeTree');
			sqlmod = SBVR2SQL.match(tree,'trans');
			*/
			
			//* TODO: I want to see the extra info regardless atm
			lfmod = tree = SBVRParser.matchAll(localStorage._server_modelAreaValue, 'expr');
			$("#lfArea").val(Prettify.match(lfmod, 'elem'));
			prepmod = tree = SBVR_PreProc.match(tree, 'optimizeTree');
			$("#prepArea").val(Prettify.match(prepmod, 'elem'));
			sqlmod = SBVR2SQL.match(tree,'trans');
			sqlEditor.setValue(Prettify.match(sqlmod, 'elem'));
			/**/
			
			SBVRParser.terms = {};
			SBVRParser.verbs = {};
			SBVRParser.fctps = {};
			SBVRParser.ruleVars = {};
			SBVRParser.ruleVarsCount = 0;
			
			tree = SBVRParser.matchAll(modelT, 'expr');
			tree = SBVR_PreProc.match(tree, "optimizeTree");
			trnmod = SBVR2SQL.match(tree,'trans');
			
			localStorage._server_modelAreaDisabled = true;
			db.transaction(function (tx) {
				executeSasync(tx, sqlmod, caller, 
					function(tx, sqlmod, caller, successCallback, failureCallback, headers, result) {
							
						//TODO: fix this as soon as the successCalback mess is fixed
						executeTasync(tx, trnmod, caller, 
							function(tx, trnmod, caller, successCallback, failureCallback, headers, result){
	console.log('1');
							
								localStorage._server_onAir = true;
						
								//TODO: figure this out
								//txtmod stores the latest executed model?
								localStorage._server_txtmod = localStorage._server_modelAreaValue; 
						
								localStorage._server_sqlmod = JSON.stringify(sqlmod);
								localStorage._server_lfmod = JSON.stringify(lfmod);
								localStorage._server_prepmod = JSON.stringify(prepmod);
								localStorage._server_trnmod = JSON.stringify(trnmod);
								
								successCallback(headers, result)
	console.log('2');
							}, 
						failureCallback, headers, result);
						//executeT(trnmod)
					}, function(errors){
						localStorage._server_modelAreaDisabled = false;
						console.log(errors);
						failureCallback(errors)
					},{'status-line': 'HTTP/1.1 200 OK'}
				);
			})
		}
	}else if(tree[0]=='update'){
		if(method=="POST"){
			/*
			update code will go here, based on execute
			*/
		}
	}else if(tree[0]=='data'){
		if(tree[1]==undefined){
			switch(method){
				case "GET":
					result = {};
					ents = [];
					console.log(sqlmod);
					for(var i=1;i<sqlmod.length;i++){
						if (sqlmod[i][0] == 'term'){
							ents.push({"id":sqlmod[i][1],"name":sqlmod[i][2]});
						}
					}
					result.terms = ents;
					
					ents = [];
					for(var i=1;i<sqlmod.length;i++){
						if (sqlmod[i][0] == 'fcTp'){
							//console.log(sqlmod[i]);
							ents.push({"id":sqlmod[i][1],"name":sqlmod[i][2]});
						}
					}
					result.fcTps = ents;
					//console.log(result);
					successCallback({'status-line': 'HTTP/1.1 200 OK'}, JSON.stringify(result), caller);
			}
		}else if(tree[1][1]=='transaction' && method == 'GET'){
			//what's the id? tree[1][3][1][1][3]
			o = {'id' : tree[1][3][1][1][3],
			'tcURI' : '/transaction',
			'lcURI' : '/data/lock',
			'tlcURI' : '/data/lock-belongs_to-transaction',
			'rcURI' : '/data/resource',
			'lrcURI' : '/data/resource-is_under-lock',
			'slcURI' : '/data/lock-is_shared',
			'xlcURI' : '/data/lock-is_exclusive',
			'ctURI' : '/data/transaction*filt:transaction.id=' + tree[1][3][1][1][3] + '/execute'}
			successCallback({'status-line': 'HTTP/1.1 200 OK'}, JSON.stringify(o), caller);
		}else{
			switch(method){
				case "GET":
					//console.log('>GET', tree[1][1], tree);
					ftree=[];
					if(tree[1][0] == 'term'){
						ftree = tree[1][3];
					}else if(tree[1][0] == 'fcTp'){
						ftree = tree[1][4];
					}

					db.transaction(function (tx) {
						//console.log('>>GET', tree[1][1], tree, ftree);
						var sql = '';
						if(tree[1][0] == 'term'){
							sql = "SELECT " + "*" + " FROM " + tree[1][1];
							if(ftree.length!=1){sql += " WHERE "}
						}else if(tree[1][0] == 'fcTp'){
							//process fact type query
							ft = tree[1][1];
							fl = ["'" + ft + "'.id AS id"];
							jn = [];
							tb = ["'" + ft + "'"]
							for(var i=1;i<tree[1][2].length;i++){
								fl.push("'" + tree[1][2][i] + "'" + ".'id' AS '" + tree[1][2][i] + "_id'");
								fl.push("'" + tree[1][2][i] + "'" + ".'name' AS '" + tree[1][2][i] + "_name'");
								tb.push("'" + tree[1][2][i] + "'");
								jn.push("'" + tree[1][2][i] + "'" + ".'id' = " + 
								"'" + ft + "'" + "." + "'" + tree[1][2][i] + "_id" + "'");
							}
							sql = "SELECT " + fl.join(', ') + " FROM " + tb.join(', ') + 
							' WHERE ' + jn.join(' AND ')
							if(ftree.length!=1){sql += " AND "}
						}
						
						if(ftree.length!=1){
							//process filters and sorts, append to sql
							var filts = [];
							for(var i=1;i<ftree.length;i++){
								if(ftree[i][0] == 'filt'){
									//process filter
									for(var j=1;j<ftree[i].length;j++){
										obj = ''
										if(ftree[i][j][1][0] != undefined){
											obj = "'" + ftree[i][j][1] + "'" + '.'
										}
										filts.push(obj + "'" + ftree[i][j][2] + "'" + 
										op[ftree[i][j][0]] + ftree[i][j][3]);
									}
								}else if(ftree[i][0] == 'sort'){
									//process sort
								}
							}
							sql += filts.join(' AND ');
						}
						
						if(sql!=''){
							//console.log(sql);
							tx.executeSql(sql + ';', [], function(tx,result){
								reslt = {};
								ents = [];
								for(var i=0;i<result.rows.length;i++){
									ents.push(result.rows.item(i));
								}
								reslt["instances"] = ents;
								//console.log(sql, JSON.stringify(reslt));
								successCallback({'status-line': 'HTTP/1.1 200 OK'}, JSON.stringify(reslt), caller);
							});
						}
					});
					break;
				case "POST":
					//console.log(body);
					//figure out if it's a POST to transaction/execute
					ftree=[];
					if(tree[1][0] == 'term'){
						ftree = tree[1][3];
					}else if(tree[1][0] == 'fcTp'){
						ftree = tree[1][4];
					}
					
					isExecute = false;
					for(var i=1;i<ftree.length;i++){
						if(ftree[i][0] == 'execute'){
							isExecute = true;
							break;
						}
					}
					
					//console.log(tree[1][1], isExecute)
					if(tree[1][1]=='transaction' && isExecute){
						//console.log('transaction executing')
						//get id
						var id = 0;
						if(tree[1][0] == 'term'){
							id = tree[1][2]
						}else if(tree[1][0] == 'fcTp'){
							id = tree[1][3]
						}
						if(id == ''){id=0;}
						
						//if the id is empty, search the filters
						if(id==0){
							for(var i=1;i<ftree.length;i++){
								if(ftree[i][0] == 'filt'){
									if(ftree[i][1][0] == 'eq' && ftree[i][1][2] == 'id'){
										id = ftree[i][1][3];
										break;
									}
								}
							}
						}

						//get all locks of transaction
						db.transaction(function (tx) {
							sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id
							tx.executeSql(sql + ';', [], function(tx,locks){
								endLock(tx, locks, 0, id, caller, successCallback, failureCallback);
							});
						}, function(error){
							//console.log(error.message);
							db.transaction(function (tx) {
								//fetch list of locks
								sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id;
								tx.executeSql(sql + ';', [], function(tx,locks){
									//for each lock, do cleanup
									for(i=0;i<locks.rows.length;i++){
										var lock_id = locks.rows.item(0).lock_id
									
										sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + lock_id
										console.log(sql)
										tx.executeSql(sql + ';', [], function(tx, result){});
									
										sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=' + lock_id
										console.log(sql)
										tx.executeSql(sql + ';', [], function(tx, result){});
										
										sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=' + lock_id
										console.log(sql)
										tx.executeSql(sql + ';', [], function(tx, result){});
									
										sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=' + lock_id
										console.log(sql)
										tx.executeSql(sql + ';', [], function(tx, result){});
									
										sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=' + lock_id
										console.log(sql)
										tx.executeSql(sql + ';', [], function(tx, result){});
									
										sql = 'DELETE FROM "lock" WHERE "id"=' + lock_id
										console.log(sql)
										tx.executeSql(sql + ';', [], function(tx, result){});
									}
									
									sql = 'DELETE FROM "transaction" WHERE "id"=' + id
									console.log(sql)
									tx.executeSql(sql, [], function(tx, result){});
								});
							});
						});
					} else {
						var bd = JSON.parse(body);
						var fds = [];
						var vls = [];
						for(var pair in bd){
							if (bd.hasOwnProperty(pair)) {
								for(var k in bd[pair]){
									if (bd[pair].hasOwnProperty(k)){
										fds.push(k);
										vls.push(JSON.stringify(bd[pair][k]));
									}
								}
							}
						}
						var sql = 'INSERT INTO "' + tree[1][1] + '"("' + fds.join('","') 
						+ '") VALUES (' + vls.join(',') + ')';
						db.transaction(function (tx) {
							tx.executeSql(sql + ';', [], function(tx,result){
								validateDB(tx, sqlmod, caller, 
									function(tx, sqlmod, caller, failureCallback, headers, result){
										successCallback(headers, result, caller)
									}, 
									failureCallback, 
									{
										'status-line':'HTTP/1.1 201 Created',
										'location':'/data/' + tree[1][1] + '*filt:' + tree[1][1] + '.id=' + result.insertId
									},
									''
								);
							});
						});
					}
					break;
				case "PUT":
					var ftree=[];
					if(tree[1][0] == 'term'){
						ftree = tree[1][3];
					}else if(tree[1][0] == 'fcTp'){
						ftree = tree[1][4];
					}

					var id = 0;
					if(tree[1][0] == 'term'){
						id = tree[1][2]
					}else if(tree[1][0] == 'fcTp'){
						id = tree[1][3]
					}
					if(id == ''){id=0;}
					
					//if the id is empty, search the filters
					if(id==0){
						for(var i=1;i<ftree.length;i++){
							if(ftree[i][0] == 'filt'){
								if(ftree[i][1][0] == 'eq' && ftree[i][1][2] == 'id'){
									id = ftree[i][1][3];
									break;
								}
							}
						}
					}
					
					//figure out if this is a CR posted to a Lock
					hasCR = false;
					for(var i=1;i<ftree.length;i++){
						if(ftree[i][0] == 'cr'){
							hasCR = true;
							break;
						}
					}
					
					if(tree[1][1]=='lock' && hasCR){
						//CR posted to Lock
						var bd = JSON.parse(body);
						var ps = [];
						for(var pair in bd){
							if (bd.hasOwnProperty(pair)) {
								for(var k in bd[pair]){
									if (bd[pair].hasOwnProperty(k)){
										ps.push([id,k,typeof bd[pair][k],bd[pair][k]]);
									}
								}
							}
						}
						//sql="INSERT INTO 'conditional_representation'('lock_id','field_name','field_type','field_value')"
						//"VALUES ('','','','')"
						//console.log(ps);
						db.transaction(function (tx) {
							var sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id
							tx.executeSql(sql, [], function(tx, result){});

							for(var item in ps){
								if(ps.hasOwnProperty(item)){
									sql = "INSERT INTO 'conditional_representation'('lock_id',"
									sql += "'field_name','field_type','field_value')"
									sql += "VALUES ('" + ps[item][0] + "','" + ps[item][1] + "','" 
									sql += ps[item][2] + "','" + ps[item][3] + "')"
									tx.executeSql(sql, [], function(tx, result){});
								}
							}
						});
					} else {
						errs=[];
						db.transaction(function (tx) {
							sql="SELECT NOT EXISTS(SELECT * FROM 'resource-is_under-lock' AS r " +
							"WHERE r.'resource_type'=='" + tree[1][1] + "' " +
							"AND r.'resource_id'==" + id + ") AS result;";
							
							tx.executeSql(sql, [], function(tx, result){
								if(result.rows.item(0).result == 1){
									if(id != ''){
										bd = JSON.parse(body);
										ps = [];
									
										for(var pair in bd){
											if (bd.hasOwnProperty(pair)) {
												for(var k in bd[pair]){
													if (bd[pair].hasOwnProperty(k)){
														ps.push(k + '=' + JSON.stringify(bd[pair][k]));
													}
												}
											}
										}
									
										sql = 'UPDATE "' + tree[1][1] + '" SET ' + ps.join(',') + 
										' WHERE id=' + id + ';'; 
										tx.executeSql(sql, [], function(tx){
											validateDB(tx, sqlmod, caller, 
												function(tx, sqlmod, caller, failureCallback, headers, result){
													successCallback(headers, result, caller)
												}, 
												failureCallback, {'status-line':'HTTP/1.1 200 OK'},
												''
											);
										});
									}
								}else{
									failureCallback(["The resource is locked and cannot be edited"]);
								}
							});
						}, function(err){});
					}
					break;
				case "DELETE":
					ftree=[];
					if(tree[1][0] == 'term'){
						ftree = tree[1][3];
					}else if(tree[1][0] == 'fcTp'){
						ftree = tree[1][4];
					}

					var id = 0;
					if(tree[1][0] == 'term'){
						id = tree[1][2]
					}else if(tree[1][0] == 'fcTp'){
						id = tree[1][3]
					}
					if(id == ''){id=0;}
					//console.log(id);
					//if the id is empty, search the filters for one
					if(id==0){
						for(var i=1;i<ftree.length;i++){
							if(ftree[i][0] == 'filt'){
								if(ftree[i][1][0] == 'eq' && ftree[i][1][2] == 'id'){
									id = ftree[i][1][3];
									break;
								}
							}
						}
					}
					
					//figure out if this is a CR posted to a Lock
					hasCR = false;
					for(var i=1;i<ftree.length;i++){
						if(ftree[i][0] == 'cr'){
							hasCR = true;
							break;
						}
					}
					//console.log('DELETE', id, hasCR, ftree);
					
					if(id != 0){
						//console.log(tree[1][1]);
						if(tree[1][1]=='lock' && hasCR){
							//CR posted to Lock
							//insert delete entry
							db.transaction(function (tx) {
								var sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id
								tx.executeSql(sql, [], function(tx, result){});
								sql = "INSERT INTO 'conditional_representation'('lock_id',"
								sql += "'field_name','field_type','field_value')"
								sql += "VALUES ('" + id + "','__DELETE','','')"
								tx.executeSql(sql, [], function(tx, result){});
							});
						} else {
							db.transaction(function (tx) {
								sql="SELECT NOT EXISTS(SELECT * FROM 'resource-is_under-lock' AS r " +
								"WHERE r.'resource_type'=='" + tree[1][1] + "' " +
								"AND r.'resource_id'==" + id + ") AS result;";
							
								tx.executeSql(sql, [], function(tx, result){
									if(result.rows.item(0).result == 1){
										sql = 'DELETE FROM "' + tree[1][1] + '" WHERE id=' + id + ';'; 
									
										tx.executeSql(sql, [], function(tx,result){
											validateDB(tx, sqlmod, caller, 
												function(tx, sqlmod, caller, failureCallback, headers, result){
													successCallback(headers, result, caller)
												}, 
												failureCallback, {'status-line':'HTTP/1.1 200 OK'},
												''
											);
										});
										//console.log(sql);
									}else{
										failureCallback(["The resource is locked and cannot be deleted"]);
									}
								});
							}, function(err){});
						}
					}
					break;
			}
		}
	} else if(tree[0]==''){
		if(method=="DELETE"){
			//for some bizarre reason sqlmod is not accessible within db.transaction.
			if(!localStorage._server_onAir=='true'){
				var locmod=sqlmod;
			}else{
				var locmod=[];
			}
			db.transaction(function (tx){
				for(var i=1;i<locmod.length;i++){
					if (locmod[i][0] == 'fcTp' || locmod[i][0] == 'term'){
						tx.executeSql(locmod[i][2]);
					}
				}
			});
			
			//for some bizarre reason trnmod is not accessible within db.transaction.
			if(!localStorage._server_onAir=='true'){
				var locmod=trnmod;
			}else{
				var locmod=[];
			}
			db.transaction(function (tx){
				for(var i=1;i<locmod.length;i++){
					if (locmod[i][0] == 'fcTp' || locmod[i][0] == 'term'){
						tx.executeSql(locmod[i][2]);
					}
				}
			});
			
			//TODO: these two do not belong here
			localStorage._server_modelAreaValue = "";
			localStorage._server_modelAreaDisabled = false;
			trnmod=[];
			lfmod=[];
			trnmod=[];
			sqlmod=[];
			
			localStorage._server_onAir = false
			
			localStorage._server_sqlmod = '';
			localStorage._server_lfmod = '';
			localStorage._server_prepmod = '';
			localStorage._server_txtmod = '';
			
			successCallback({'status-line': 'HTTP/1.1 200 OK'}, '');
		}
	}
}

function endLock(tx, locks, i, trans_id, caller, successCallback, failureCallback){
	//console.log("i>>",i);
	//get conditional representations (if exist)
	var lock_id = locks.rows.item(i).lock_id;
	sql = 'SELECT * FROM "conditional_representation" WHERE "lock_id"=' + lock_id;	
	tx.executeSql(sql + ';', [], function(tx,crs){
		//find which resource is under this lock
		sql = 'SELECT * FROM "resource-is_under-lock" WHERE "lock_id"=';
		sql += crs.rows.item(0).lock_id;
		tx.executeSql(sql + ';', [], function(tx,locked){
			if(crs.rows.item(0).field_name == '__DELETE'){
				//delete said resource
				sql = 'DELETE FROM "' + locked.rows.item(0).resource_type;
				sql += '" WHERE "id"=' + locked.rows.item(0).resource_id;
				//console.log(sql);
				tx.executeSql(sql + ';', [], function(tx,result){
					if(i<locks.rows.length-1){ 
						endLock(tx, locks, i+1, trans_id, caller, successCallback, failureCallback); 
					} else {
						//delete transaction
						sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id;
						tx.executeSql(sql + ';', [], function(tx,result){ /*console.log("t ok")*/ });
						//console.log(sql);

						validateDB(tx, sqlmod, caller, 
							function(tx, sqlmod, caller, failureCallback, headers, result){
								successCallback(headers, result, caller)
							}, 
							failureCallback, 
							{'status-line':'HTTP/1.1 200 OK'},
							''
						);
					}
				});
			} else {
				//commit conditional_representation
				sql = 'UPDATE "' + locked.rows.item(0).resource_type + '" SET ' 
				for(var j=0;j<crs.rows.length;j++){
					sql += '"' + crs.rows.item(j).field_name + '"=';
					if(crs.rows.item(j).field_type == 'string'){
						sql += '"' + crs.rows.item(j).field_value + '"';
					} else {
						sql += crs.rows.item(j).field_value;
					}
					if(j<crs.rows.length-1){sql += ', ';}
				}
				sql += ' WHERE "id"=' + locked.rows.item(0).resource_id;
				//console.log(sql);
				tx.executeSql(sql + ';', [], function(tx,result){
					if(i<locks.rows.length-1){ 
						endLock(tx, locks, i+1, trans_id, caller, successCallback, failureCallback); 
					} else {
						//delete transaction
						sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id;
						tx.executeSql(sql + ';', [], function(tx,result){ console.log("t ok") });
						//console.log(sql);
						
						validateDB(tx, sqlmod, caller, 
							function(tx, sqlmod, caller, failureCallback, headers, result){
								successCallback(headers, result, caller)
							}, 
							failureCallback, 
							{'status-line':'HTTP/1.1 200 OK'},
							''
						);
					}
				});
			}
			//delete conditional_representation entries
			sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=';
			sql += crs.rows.item(0).lock_id;
			//console.log(sql);
			tx.executeSql(sql + ';', [], function(tx,result){ console.log("cr ok") });
			//delete resource-is_under-lock
			sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=';
			sql += crs.rows.item(0).lock_id;
			//console.log(sql);
			tx.executeSql(sql + ';', [], function(tx,result){ console.log("rl ok") });
		});
	});
	//delete lock from 'is_shared'
	sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=';
	sql += lock_id;
	//console.log(sql);
	tx.executeSql(sql + ';', [], function(tx,result){ console.log("ls ok") });
	//delete lock from 'is_exclusive'
	sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=';
	sql += lock_id;
	//console.log(sql);
	tx.executeSql(sql + ';', [], function(tx,result){ console.log("le ok") });
	//delete lock-belongs_to-transaction
	sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=';
	sql += lock_id;
	//console.log(sql);
	tx.executeSql(sql + ';', [], function(tx,result){ console.log("lt ok") });
	//delete lock
	sql = 'DELETE FROM "lock" WHERE "id"=' + lock_id;
	//console.log(sql);
	tx.executeSql(sql + ';', [], function(tx,result){ console.log("l ok") });
}

function validateDB(tx, sqlmod, caller, successCallback, failureCallback, headers, result){
	var k=0;
	var m=0;
	var l=[];
	var errors=[];
	var par = 1;
	var tot = 0; //total queries
	var tex = 0; //total queries executed
	for(var h=0;h<sqlmod.length;h++){
		if (sqlmod[h][0] == 'rule'){
			query = sqlmod[h][4];
			//console.log(query);
			tot++;
			l[tot] = sqlmod[h][2]
			tx.executeSql(query, [], function(tx, result){
				//console.log(result.rows.item(0).result);
				tex++;
				if(result.rows.item(0).result==0){
					errors.push(l[tex]);
				}
				par *= result.rows.item(0).result;
				//console.log(errors, par);
				if(tot==tex){
					if(par == 0){
						//console.log(errors);
						failureCallback(errors);
						//bogus sql to raise exception
						tx.executeSql("DROP TABLE '__Fo0oFoo'");
					}else{
						successCallback(tx, sqlmod, caller, failureCallback, headers, result);
					}
				}
			});
		}
	}
}

function executeSasync(tx, sqlmod, caller, successCallback, failureCallback, headers, result){
	k=0;m=0;l=[];
	
	//Create tables related to terms and fact types
	for(var i=0;i<sqlmod.length;i++){
		if (sqlmod[i][0] == 'fcTp' || sqlmod[i][0] == 'term'){
			tx.executeSql(sqlmod[i][4]);
		}
	};

	//Validate the [empty] model according to the rules. 
	//This may eventually lead to entering obligatory data.
	//For the moment it blocks such models from execution.
	
	validateDB(tx, sqlmod, caller, successCallback, failureCallback, headers, '');
}


function executeTasync(tx, trnmod, caller, successCallback, failureCallback, headers, result){
	//Execute transaction model. 
	executeSasync(tx, trnmod, caller, function(tx, trnmod, caller, successCallback, failureCallback, headers, result){
		//Hack: Add certain attributes to the transaction model tables. 
		//This should eventually be done with SBVR, when we add attributes.
		tx.executeSql("ALTER TABLE 'resource-is_under-lock' ADD COLUMN resource_type TEXT", []);
		tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_name TEXT", []);
		tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_value TEXT", []);
		tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_type TEXT", []);
		tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN lock_id TEXT", []);
	}, function(errors){
		localStorage._server_modelAreaDisabled = false;
		failureCallback(errors)
	}, headers,
	result);
}

function updateRules(sqlmod){
	//Create tables related to terms and fact types
	//if not exists clause makes sure table is not double-created,
	//tho this should be dealt with more elegantly.
	for(var i=0;i<sqlmod.length;i++){
		if (sqlmod[i][0] == 'fcTp' || sqlmod[i][0] == 'term'){
			tx.executeSql(sqlmod[i][4]);
		}
	};
	
	//Validate the [empty] model according to the rules. 
	//This may eventually lead to entering obligatory data.
	//For the moment it blocks such models from execution.
	for(var i=0;i<sqlmod.length;i++){
		if (sqlmod[i][0] == 'rule'){
			query = sqlmod[i][4];
			l[++m] = sqlmod[i][2];

			tx.executeSql(query, [],
				function(tx, result){
					if(result.rows.item(0)['result'] == 0){
						//TODO: alert?! this should be using a callback. (#3)
						alert('Error: ' + l[++k])
					};
				}, 
				null
			);
		}
	};
}

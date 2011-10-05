"use strict"
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

function getBranch(branch, loc){
	for(var i=0;i<loc.length;i++){
		branch = branch[loc[i]+2];
	}
	//console.log(branch[1][0]);
	return branch;
}

function getPid(branch, loc){
	var pid = branch[1][0];
	for(var i=0;i<loc.length;i++){
		branch = branch[loc[i]+2];
		if(branch[0]=='col'){
			pid += '--' + branch[1][0];
		} else {
			pid += '--' + branch[1][1];
		}
	}
	return pid;
}

function getTarg(tree, loc, actn, newb){
	//console.log(tree, loc, actn, newb);
	
	//create ''pointer''
	var ptree = jQuery.extend(true, [], tree);
	var parr = ptree
	
	for(var i=0;i<loc.length;i++){
		parr = parr[loc[i]+2];
	}
	
	switch(actn){
		case 'add':
			parr.push(newb);
			break;
		case 'del':
			//this works with child#, perhaps id is better?
			parr.splice((newb+2),1);
			break;
	}

	//render tree into hash
	var pHash = ClientURIUnparser.match(ptree, 'trans');
	//console.log('pHash: ', pHash)
	return pHash
}

function serverAPI(about, filters){
	//does not work right for fact types

	var op = {
		"eq":"=", 
		"ne":"!=", 
		"lk":"~"
	};
	var flts = '';
	
	//render filters
	for(var i=1;i<filters.length;i++){
		if(about == filters[i][1]){
			flts = flts + filters[i][1] + '.' + filters[i][2] + op[filters[i][0]] + filters[i][3] + ';';
		}
	}
	
	if(flts!=''){
		flts = '*filt:' + flts;
	}
	return '/data/' + about + flts;
}

function drawData(tree){
	var rootURI = location.pathname;
	var filters = ["filters"];

	$("#dataTab").html(
		"<table id='terms'><tbody><tr><td></td></tr></tbody></table>" + //this tbl must be removed
		"<div align='left'><br/><input type='button' value='Apply All Changes' " + 
		" onClick='runTrans();return false;'></div>"
		// + "<table id='fcTps'><tbody><tr><td>Fact Types:</td></tr></tbody></table>"
	);
	
	serverRequest("GET", "/data/", [], '', function(statusCode, result, headers){
		var objcb = {
			callback: function(n, prod){
				//console.log(n,prod);
				this.data.push([n,prod]);
				if(++this.totend==this.totsub){
					this.data.sort(function(a,b){
						return a[0] - b[0];
					});
					for(var i=0;i<this.data.length;i++){
						$("#terms").append(this.data[i][1]);
					}
				}
			}
		}
		
		objcb.totsub = result.terms.length;
		objcb.totend = 0;
		objcb.data = [];
		
		/*ftcb = {
			callback: function(n, prod){
				//console.log(n,prod);
				this.data.push([n,prod]);
				if(++this.totend==this.totsub){
					this.data.sort(function(a,b){ return a[0] - b[0]; });
					for(var i=0;i<this.data.length;i++){
						$("#fcTps").append(this.data[i][1]);
					}
				}
			}
		}
		ftcb.totsub = result.fcTps.length;
		ftcb.totend = 0;
		ftcb.data = [];*/
		
		for(var i=0;i<result.terms.length;i++){
			var launch = -1;
			for(var j=3;j<tree.length;j++){
				if(tree[j][1][0] == result.terms[i].id){
					launch = j;
				}
			}
			
			var pre = "<tr id='tr--data--" + result.terms[i].id + "'><td>"; 
			if(launch == -1){
				pre += result.terms[i].name;
			} else {
				pre += "<div style='display:inline; background-color:#FFFFFF; " +  
				"'>" + result.terms[i].name + "</div>";
			}
			var post = "</td></tr>"
			
			if(launch != -1){
				npos = getTarg(tree, [], 'del', launch-2);
				
				pre += "<div style='display:inline;background-color:#FFFFFF" + "'> " +
				"<a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
				
				var model;
				var uid
				// request schema from server and store locally.
				serverRequest("GET", "/model/", [], "", function(statusCode, result) {
					model = SBVRParser.matchAll(result, "expr");
					model = SBVR_PreProc.match(model, "optimizeTree");
					model = SBVR2SQL.match(model, "trans");
					uid = new uidraw(i, objcb, pre, post, rootURI, [], [], filters, [launch-2], true, tree, model); 
					uid.subRowIn();
				})
			}else{
				var newb = ['col', [result.terms[i].id], ['mod']];
				var npos = getTarg(tree, [], 'add', newb);

				pre += " <a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
				
				objcb.callback(i,pre+post);
			}
		}
		
		/*for(var i=0;i<result.fcTps.length;i++){
			pre = "<tr id='tr--tr--data--" + result.terms[i].id + "'><td>" + result.fcTps[i].name;
			post = "</td></tr>"
			
			launch = -1;
			for(var j=3;j<tree.length;j++){
				if(tree[j][1][0] == result.fcTps[i].id){ launch = j; }
			}
			//console.log(launch);
			
			if(launch != -1){
				npos = getTarg(tree, [], 'del', launch-2);
				
				pre += "<div style='display:inline;background-color:#FFFFFF'>" + 
				" <a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
				
				//console.log(4);
				uid = new uidraw(i, ftcb, pre, post, rootURI, [], [], filters, [launch-2], true, tree); 
				uid.subRowIn();
			}else{
				newb = ['col', [result.fcTps[i].id], ['mod']];
				npos = getTarg(tree, [], 'add', newb);

				pre += " <a href='" + rootURI + "#!/" + npos + "' " + 
				"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
				
				ftcb.callback(i,pre+post);
			}
		}*/
	});
}

function uidraw(idx, objcb, pre, post, rootURI, pos, pid, filters, loc, even, ftree, cmod){
	//console.log(loc);
	this.idx = idx;
	this.objcb = objcb; //issue here
	this.pre = pre;
	this.post = post;
	this.rootURI = rootURI;
	this.pos = pos;
	this.loc = loc;
	this.even = even;
	this.ftree = ftree;
	this.branch = getBranch(this.ftree,this.loc);
	this.filters = filters;
	//if(this.filters == []){this.filters == ['filters'];}
	this.filters = filtmerge(this.branch, this.filters);
	this.pid = getPid(this.ftree, this.loc);
	this.about = this.branch[1][0];
	this.data = [];
	this.items = 0;
	this.submitted = 0;
	this.html = '';
	this.adds = 0;
	this.addsout = 0;
	this.cols = 0;
	this.colsout = 0;
	this.rows = 0;
	this.targ = '';
	this.type = 'term';
	this.schema = [];
	if(even){
		this.bg = '#FFFFFF';
		this.unbg = '#EEEEEE'
	} else {
		this.bg = '#EEEEEE';
		this.unbg = '#FFFFFF'
	}
	
	//is the thing we're talking about a term or a fact type?
	for(var j=1;j<cmod.length;j++){
		if(cmod[j][1]==this.about){
			this.type = cmod[j][0];
			if(this.type == 'fcTp'){
				this.schema = cmod[j][6];
			}
		}
	}
	
	this.subRowIn = function(){
		var parent = this;
		//console.log(this.branch);
		if(this.branch[0]=='col'){
			this.pre += "<div class='panel' style='background-color:" + this.bg +
			";'>" + "<table id='tbl--" + pid + "'><tbody>";
			this.post += "</tbody></table></div>";
			//this.filters = filtmerge(this.branch, ['filters']); //this.filters);
			//this.targ = getTarg(ftree,loc,"del",1);
			this.targ = serverAPI(this.about, this.filters);
			
			//are there children with 'add' modifiers? huh?
			for(var j=3;j<this.branch.length;j++){ //iterate children
				//console.log(this.branch[j]);
				if(this.branch[j][0] == 'ins' &&
				this.branch[j][1][0] == this.about &&
				this.branch[j][1][1] == undefined){ //iterate modifiers
					for(var k=1;k<this.branch[j][2].length;k++){
						if(this.branch[j][2][k][0] == 'add'){
							this.adds++;
						}
					}
				}
			}
			
			//are there any subcollections?
			for(i=1;i<cmod.length;i++){
				if(cmod[i][0] == 'fcTp'){
					for(j=0;j<cmod[i][6].length;j++){
						if(cmod[i][6][j][1] == this.about){
							this.cols++;
						}
					}
				}
			}
			
			//are there expanded collection children? huh?
			//for(var j=3;j<this.branch.length;j++){ //iterate children
			//	if(this.branch[j][0] == 'col'){ //iterate collections
			//		this.cols++;
			//	}
			//}
			
			///load collection data
			//console.log(this.targ);
			
			serverRequest("GET", this.targ, [], '', function(statusCode, result, headers){
				var resl = '';
				
				parent.rows = result.instances.length;
				parent.items = parent.rows + 2 + parent.adds + 1 + parent.cols;
				
				//get link which adds an 'add inst' dialog.
				var newb = ['ins', [parent.about], ['mod', ['add']]];
				var npos = getTarg(parent.ftree, parent.loc, 'add', newb);
				
				parent.data.push([parent.rows + 1,"<tr><td><a href = '" + rootURI + "#!/" + 
				npos + "' onClick='location.hash=\"#!/" + npos + "\";return false;'>" + 
				"[(+)add new]</a></td></tr>"]);
				
				//render each child and call back
				for(var i=0;i<result.instances.length;i++){
					var launch = -1;
					var actn = 'view'
					for(var j=3;j<parent.branch.length;j++){
						if(parent.branch[j][0] == 'ins' &&
						parent.branch[j][1][0] == parent.about && 
						(parent.branch[j][1][1] == result.instances[i].id || 
						parent.branch[j][1][1] == result.instances[i].name)
						&& parent.branch[j][1][1] != undefined){
							launch = j;
							
							//find action.
							for(var k=1;k<parent.branch[j][2].length;k++){
								if(parent.branch[j][2][k][0]=='edit'){
									actn = 'edit';
									break;
								}
								if(parent.branch[j][2][k][0]=='del'){
									actn = 'del';
									break;
								}
							}
						}
					}
					//console.log(launch,actn);
					
					var posl = parent.targ + '/' + parent.about + "." + result.instances[i].id;
					
					var prel = "<tr id='tr--" + pid + "--" + result.instances[i].id + "'><td>";
					
					if(launch != -1){
						prel+="<div style='display:inline;background-color:" + parent.unbg + "'>"
					}
					
					if(parent.type == "term"){
						prel += result.instances[i].name;
					}else if(parent.type == "fcTp"){
						//console.log(result.instances[i], parent.schema);
						for (var j=0;j<parent.schema.length;j++){
							if(parent.schema[j][0]=='term'){
								prel += result.instances[i][parent.schema[j][1] + '_name'] + ' ';
							}else if(parent.schema[j][0]=='verb'){
								prel += '<em>' + parent.schema[j][1] + '</em> ';
							}
						}
					}
					
					if(launch != -1){
						prel+="</div>"
					}
					
					if(launch != -1 && actn == 'view'){
						npos = getTarg(parent.ftree, parent.loc, 'del', launch-2);
						
						prel += "<div style='display:inline;background-color:" + parent.unbg + 
						"'> <a href='" + rootURI + "#!/" + npos + "' " + "onClick='location.hash=\"#!/" + 
						npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
					} else if(launch == -1){
						newb = ['ins', [parent.about, result.instances[i].id], ['mod']];
						npos = getTarg(parent.ftree, parent.loc, 'add', newb);
						
						prel += " <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='View' class='ui-icon ui-icon-search'></span></a>";
					}
					
					if(launch != -1 && actn == 'edit'){
						npos = getTarg(parent.ftree, parent.loc, 'del', launch-2);
						
						prel += "<div style='display:inline;background-color:" + parent.unbg + 
						"'> <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a></div>";
					} else if(launch == -1){
						newb = ['ins', [parent.about, result.instances[i].id], ['mod', ['edit']]];
						npos = getTarg(parent.ftree, parent.loc, 'add', newb);
						
						prel +=	" <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Edit' class='ui-icon ui-icon-pencil'></span></a>";
					}
					
					if(launch != -1 && actn == 'del'){
						npos = getTarg(parent.ftree, parent.loc, 'del', launch-2);
						prel += "<div style='display:inline;background-color:" + parent.unbg + 
						"'> <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'>[unmark]</a></div>";
					} else if(launch == -1){
						newb = ['ins', [parent.about, result.instances[i].id], ['mod', ['del']]];
						npos = getTarg(parent.ftree, parent.loc, 'add', newb);

						prel +=	" <a href='" + rootURI + "#!/" + npos + "' " + 
						"onClick='location.hash=\"#!/" + npos + "\";return false'><span title='Delete' class='ui-icon ui-icon-trash'></span></a>";
					}
					
					var postl = "</td></tr>";
					
					if(launch != -1){
						var locn = parent.loc.concat([launch-2]);
						var uid = new uidraw(i, parent, prel, postl, rootURI, [], [], parent.filters, locn, !parent.even, parent.ftree, cmod); 
						uid.subRowIn();
					}else{
						parent.callback(i,prel+postl);
					}
				}
				
				parent.callback(parent.rows,"<tr><td>" + 
				"<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" +
				"</td></tr>");
				
				//launch more uids to render the adds
				posl = parent.targ + '/' + parent.about
				for(var j=3;j<parent.branch.length;j++){ //iterate children
					if(parent.branch[j][0] == 'ins' &&
					parent.branch[j][1][0] == parent.about && 
					parent.branch[j][1][1] == undefined){
						var isadd = false;
						for(var k=1;k<parent.branch[j][2].length;k++){ //iterate modifiers
							if(parent.branch[j][2][k][0] == 'add'){
								isadd=true;
							}
						}
						if(isadd){
							locn = parent.loc.concat([j-2]);
							uid = new uidraw(parent.rows + 1 + ++parent.addsout, parent, "<tr><td>", "</td></tr>", rootURI, [], [], parent.filters, locn, !parent.even, parent.ftree, cmod);
							uid.subRowIn();
						}
					}
				}
				
				parent.callback(parent.rows + 1 + parent.adds + 1,
				"<tr><td>" + 
				"<hr style='border:0px; width:90%; background-color: #999; height:1px;'>" +
				"</td></tr>");
				
				//launch a final callback to add the subcollections.
				for(i=1;i<cmod.length;i++){
					if(cmod[i][0] == 'fcTp'){
						//console.log(cmod[i]);
						for(j=0;j<cmod[i][6].length;j++){
							//console.log(cmod[i][6][j],parent.about);
							if(cmod[i][6][j][1] == parent.about){
								launch = -1;
								for(var j=3;j<parent.branch.length;j++){
									if(parent.branch[j][1][0] == cmod[i][1]){
										launch = j-2;
										break;
									}
								}
								
								//console.log(cmod[i][2]);
								parent.colsout++;
								//console.log('aaa' + parent.colsout)
								var res = '';
								
								pre = "<tr id='tr--data--" + cmod[i][1] + "'><td>"; 
								
								if(launch == -1){
									pre += cmod[i][2];
								} else {
									pre += "<div style='display:inline;background-color:" + parent.unbg + 
										"'>" + cmod[i][2] + "</div>";
								}
								
								post = "</td></tr>";
								
								if(launch != -1){
									npos = getTarg(parent.ftree, parent.loc, 'del', launch);
									
									pre += "<div style='display:inline;background-color:" + parent.unbg + 
										"'>" + " <a href='" + rootURI + "#!/" + npos + "' " + 
									"onClick='location.hash=\"#!/" + npos + 
									"\";return false'><span title='Close' class='ui-icon ui-icon-circle-close'></span></a>" + "</div>";
									
									var subcolcb = {
										callback: function(n, prod){
											//console.log('a', n);
											parent.callback(n, prod);
										}
									}
									
									//console.log(pre, post);
									uid = new uidraw(parent.rows + 1 + parent.adds + 1 + parent.colsout, subcolcb, pre, post, rootURI, [], [], parent.filters, loc.concat([launch]), !parent.even, parent.ftree, cmod);
									uid.subRowIn();
								}else{
									newb = ['col', [cmod[i][1]], ['mod']];
									//console.log(parent.ftree, parent.loc);
									npos = getTarg(parent.ftree, parent.loc, 'add', newb);

									pre += " <a href='" + parent.rootURI + "#!/" + npos + "' " + 
									"onClick='location.hash=\"#!/" + npos + 
									"\";return false'><span title='See all' class='ui-icon ui-icon-search'></span></a>";
						
									res += (pre + post);
									//console.log('b', parent.rows + 1 + parent.adds + parent.colsout);
									parent.callback(parent.rows + 1 + parent.adds + 1 + 
									parent.colsout, res);
								}
							}
						}
					}
				}
			});
			
		} else if (this.branch[0]=='ins'){
			//console.log(branch);
			this.items = 1;
			this.pre += "<div class='panel' style='background-color:" + this.bg +	";'>"
			this.post += "</div>"
			var targ = serverAPI(this.about, this.filters);
			posl = targ;
			this.id = this.branch[1][1];
			actn = 'view'
			
			//find first action.
			for(var i=1;i<this.branch[2].length;i++){
				if		(this.branch[2][i][0]=='add' ){
					actn = 'add';
					break; 
				}else if(this.branch[2][i][0]=='edit'){
					actn = 'edit';
					break; 
				}else if(this.branch[2][i][0]=='del' ){
					actn = 'del';
					break; 
				}
			}
			
			switch(actn){
				case "view":
					if(this.type == "term"){
						//this.filters = filters;
						//this.filters = filtmerge(this.branch, this.filters);
						this.targ = serverAPI(this.about, this.filters);
						//console.log(this.targ, getTarg(this.ftree, this.loc, "del", 1));
						serverRequest("GET", this.targ, [], '', function(statusCode, result, headers){
							var res = ''
							for(item in result.instances[0]){
								if(item != '__clone'){
									res += item + ": " + result.instances[0][item] + "<br/>"
									//could it have a child? yes, of course! a fact type for instance.
								}
							}
							parent.callback(1,res);
						});
					} else if(this.type == "fcTp"){
						this.targ = serverAPI(this.about, this.filters);
						//console.log(this.targ);
						serverRequest("GET", this.targ, [], '', function(statusCode, result, headers){
							var res = '';
							res += "id: " + result.instances[0].id + "<br/>"
							//loop around terms
							for(var j=0;j<parent.schema.length;j++){
								if(parent.schema[j][0]=='term'){
									res += result.instances[0][parent.schema[j][1] + "_name"] + ' ';
								}else if(parent.schema[j][0]=='verb'){
									res += parent.schema[j][1] + ' ';
								}
							}
							parent.callback(1,res);
						});
					}
					break;
				case "add":
					if(this.type == "term"){
						//get schema
						var schm = '';
						for(var j=1;j<cmod.length;j++){
							if(cmod[j][1]==this.about){
								schm = cmod[j][3];
							}
						}
						
						//print form.
						var res = "<div align='right'>";
						res += "<form class = 'action' >";
						res += "<input type='hidden' id='__actype' value='addterm'>";
						res += "<input type='hidden' id='__serverURI' value='" + serverAPI(this.about,[]) + "'>";
						res += "<input type='hidden' id='__backURI' value='" + targ + "'>";
						console.log('addterm backURI='+targ);
						res += "<input type='hidden' id='__type' value='" + this.about + "'>";
						for(var j=0;j<schm.length;j++){
							switch(schm[j][0]){
								case 'Text':
									res += schm[j][2] + ": <input type='text' id='" + 
									schm[j][1] + "' /><br />";
									//console.log(schm[j]);
									break;
								case 'ForeignKey':
									alert(schm[j]);
									break;
							}
						}
						res += "<input type='submit' value='Submit This'" +
						" onClick='processForm(" + "this.parentNode" + ");return false;'>";
						res += "</form>";
						res += "</div>";

						//res += "<input type='submit' value='Cancel'" +
						//" onClick='return false;'></div>";
						
						this.callback(1,res);
					}else if(this.type == "fcTp"){
						//initialize vars
						var trms = [];
						var trmres = [];
						var trmsel = {};
						var addftcb = function(statusCode, result, headers){
							var res = ''
							
							trmres.push(result.instances);
							
							//construct dropdowns & form
							if(trms.length == trmres.length){
								//console.log(trmres);
								//loop through terms/results

								for(var j=0;j<trms.length;j++){
									res = "<select id='" + trms[j] + "_id'>"
									//Loop through options
									for(var k=0;k<trmres[j].length;k++){
										//console.log(trmres[j][k]);
										res += "<option value='" + trmres[j][k].id + "'>" + 
										trmres[j][k].name + "</option>";
									}
									res += "</select>"
									trmsel[trms[j]] = res;
								}
								
								res = '';
								res += "<form class = 'action' >";
								res += "<input type='hidden' id='__actype' value='addfctp'>";
								res += "<input type='hidden' id='__serverURI' value='" + 
											serverAPI(parent.about,[]) + "'>";
								res += "<input type='hidden' id='__backURI' value='" + posl + "'>";
								//console.log('addfctp backURI='+posl);
								res += "<input type='hidden' id='__type' value='" + parent.about + "'>";
								for(var j=0;j<parent.schema.length;j++){
									//console.log(parent.schema[j]);
									if(parent.schema[j][0]=='term'){
										res += trmsel[parent.schema[j][1]] + ' ';
									}else if(parent.schema[j][0]=='verb'){
										res += parent.schema[j][1] + ' ';
									}
								}										
								//console.log(res);
								
								//add submit button etc.
								res += "<div align='right'>";
								res += "<input type='submit' value='Submit This'" +
								" onClick='processForm(this.parentNode.parentNode);return false;'>";
								res += "</div>";
								res += "</form>";

								parent.callback(1,res);
							}
							
							//shoot off children
							
							//for(item in result.instances[0]){
								//alert([item,typeof(item),result.instances[0][item]])
							//	res += item + ": " + result.instances[0][item] + "<br/>"
								//could it have a child? yes, of course! a fact type for instance.
							//}
						}
						
						for(var j=0;j<this.schema.length;j++){
							if(this.schema[j][0]=='term'){
								trms.push(this.schema[j][1]);
							}
						}
						
						//loop around terms
						for(var j=0;j<this.schema.length;j++){
							if(this.schema[j][0]=='term'){
								var tar = serverAPI(this.schema[j][1], this.filters);
								serverRequest("GET", tar, [], '', addftcb);
							}else if(this.schema[j][0]=='verb'){
							}
						}
					}
					break;
				case "edit":
					if(this.type == "term"){
						//get schema
						var schm = '';
						for(var j=1;j<cmod.length;j++){
							if(cmod[j][1]==this.about){
								schm = cmod[j][3];
							}
						}
						
						//get data
						//this.filters = filters;
						//this.filters = filtmerge(this.branch, this.filters);
						this.targ = serverAPI(this.about, this.filters);
						//console.log(this.targ);
						serverRequest("GET", this.targ, [], '', function(statusCode, result, headers){
							//console.log(result);
							var res = ''
							var id = result.instances[0].id
							var res = "<div align='left'>";
							res += "<form class = 'action' >";
							res += "<input type='hidden' id='__actype' value='editterm'>";
							res += "<input type='hidden' id='__serverURI' value='" + 
										serverAPI(parent.about,[]) + "." + id + "'>";
							res += "<input type='hidden' id='__backURI' value='" + serverAPI(parent.about,[]) + "'>";
							res += "<input type='hidden' id='__id' value='" + id + "'>";
							res += "<input type='hidden' id='__type' value='" + parent.about + "'>";
							res += "id: " + id + "<br/>"
							for(var j=0;j<schm.length;j++){
								switch(schm[j][0]){
									case 'Text':
										res += schm[j][2] + ": <input type='text' id='" + 
										schm[j][1] + "' value = '" + result.instances[0][schm[j][1]] + 
										"' /><br />";
										break;
									case 'ForeignKey':
										console.log(schm[j]);
										break;
								}
							}
							res += "<div align = 'right'>"
							res += "<input type='submit' value='Submit This' " + 
										"onClick='processForm(this.parentNode.parentNode);return false;'>";
							res += "</div>";
							res += "</form>";
							res += "</div>";
							//console.log(res);
							parent.callback(1,res);
						});
					}else if(this.type == "fcTp"){
						this.targ = serverAPI(this.about, this.filters);
						serverRequest("GET", targ, [], '', function(statusCode, result, headers){
							var resu = result;
							
							//initialize vars
							var trms = [];
							var trmres = [];
							var trmsel = {};
							var editftcb = function(statusCode, result, headers){
								var res = ''
								
								trmres.push(result.instances);
								
								//construct dropdowns & form
								if(trms.length == trmres.length){
									//console.log(trmres);
									//loop through terms/results
									var respo = '';
									var respr = "<div align='left'>";
									respr += "<form class = 'action' >";
									respr += "<input type='hidden' id='__actype' value='editfctp'>";
									respr += "<input type='hidden' id='__serverURI' value='" + 
												serverAPI(parent.about,[]) + "." + resu.instances[0].id + "'>";
									respr += "<input type='hidden' id='__backURI' value='" + 
												serverAPI(parent.about,[]) + "'>";
									console.log('editfctp backURI='+serverAPI(parent.about,[]));
									respr += "<input type='hidden' id='__id' value='" + resu.instances[0].id + "'>";
									respr += "<input type='hidden' id='__type' value='" + parent.about + "'>";
									
									for(var j=0;j<trms.length;j++){
										res = "<select id='" + trms[j] + "_id'>"
										//Loop through options
										for(var k=0;k<trmres[j].length;k++){
											//console.log(trmres[j][k]);
											res += "<option value='" + trmres[j][k].id + "'";
											//if current value, print selected
											if(resu.instances[0][trms[j] + '_id']==trmres[j][k].id){
												res += ' selected';
											}
											res += ">" + trmres[j][k].name + "</option>";
										}
										res += "</select>"
										trmsel[trms[j]] = res;
									}
									
									//console.log(JSON.stringify(trmsel));
									
									//merge dropdowns with verbs to create 'form'
									res = '';
									
									for(var j=0;j<parent.schema.length;j++){
										//console.log(parent.schema[j]);
										if(parent.schema[j][0]=='term'){
											res += trmsel[parent.schema[j][1]] + ' ';
										}else if(parent.schema[j][0]=='verb'){
											res += parent.schema[j][1] + ' ';
										}
									}										
									//console.log(res);
									
									//add submit button etc.
									respo += "<div align = 'right'>"

									respo += "<input type='submit' value='Submit This' " 	+
									"onClick='processForm(this.parentNode.parentNode);return false;'>";
									respo += "</div>";
									respo += "</form>";
									respo += "</div>"
									
									parent.callback(1, respr + res + respo);
								}
								
								//shoot off children
								
								//for(item in result.instances[0]){
									//alert([item,typeof(item),result.instances[0][item]])
								//	res += item + ": " + result.instances[0][item] + "<br/>"
									//could it have a child? yes, of course! a fact type for instance.
								//}
							}
							
							for(var j=0;j<parent.schema.length;j++){
								if(parent.schema[j][0]=='term'){
									trms.push(parent.schema[j][1]);
								}
							}
							//console.log(trms);
					
							//loop around terms
							for(var j=0;j<parent.schema.length;j++){
								if(parent.schema[j][0]=='term'){
									var tar = serverAPI(parent.schema[j][1], parent.filters);
									serverRequest("GET", tar, [], '', editftcb);
								}else if(parent.schema[j][0]=='verb'){
								}
							}
						});
					}
					break;
				case "del":
					//console.log(getTarg(this.ftree, this.loc, "del", 1), this.ftree, this.loc);
					
					var res = "<div align='left'>";
					res += "marked for deletion";
					res += "<div align = 'right'>";
					
					//make this a function
					res += "<form class = 'action' >";
					res += "<input type='hidden' id='__actype' value='del'>";
					res += "<input type='hidden' id='__serverURI' value='" + 
								serverAPI(this.about,[]) + "." + this.id + "'>";
					res += "<input type='hidden' id='__id' value='" + this.id + "'>";
					res += "<input type='hidden' id='__type' value='" + this.about + "'>";
					res += "<input type='hidden' id='__backURI' value='" + serverAPI(this.about,[]) + "'>";
					//console.log('del backURI='+serverAPI(this.about,[])+' this.about='+this.about, this.ftree);
					res += "<input type='submit' value='Confirm' " +
					"onClick='processForm(this.parentNode.parentNode);return false;'>";
					res += "</form>";
					
					res += "</div>";
					res += "</div>";
					this.callback(1,res);
					break;
			}
		}
	}
	
	this.callback = function(n, prod){
		this.data.push([n,prod]);
		//console.log(n,prod);
		if(this.data.length==this.items){
			//>sort'em
			this.data.sort(function(a,b){
				return a[0] - b[0];
			});
			
			//console.log(this.data);
			
			this.html = this.pre;
			for(var i=0;i<this.data.length;i++){
				this.html += this.data[i][1];
			}
			this.html += this.post;
			//console.log(this.html);
			this.objcb.callback(this.idx, this.html);
		}
	}
};

function processForm(forma){
	var action = $("#__actype", forma).val();
	var serverURI = $("#__serverURI", forma).val();
	var id = $("#__id", forma).val();
	var type = $("#__type", forma).val();
	var backURI = $("#__backURI", forma).val();
	
	//id and type (and half of actype) are not yet used. 
	//Should they be used instead of serverURI?
	
	switch(action){
		case 'editterm':
		case 'editfctp':
			editInst(forma,serverURI,backURI);
			break;
		case 'addterm':
		case 'addfctp':
			addInst(forma,serverURI,backURI);
			break;	
		case 'del':
			delInst(forma,serverURI,backURI);
			break;
	}
}

function delInst(forma,uri,backURI){
	this.backURI=backURI;
	serverRequest("DELETE", uri, [], '', function(statusCode, result, headers){
		location.hash = '#!' + backURI;
	})
	return false;
}

function editInst(forma,serverURI,backURI){
	this.backURI=backURI;
	//console.log(backURI);
	var inputs = $(":input:not(:submit)", forma);
	var obj = $.map(inputs, function(n, i){
		if(n.id.slice(0,2)!="__"){
			var o = {};
			o[n.id] = $(n).val();
			return o;
		}
	});
	console.log(JSON.stringify(obj));
	serverRequest("PUT", serverURI, [], JSON.stringify(obj), function(statusCode, result, headers){
		//console.log("succ!", result);
		location.hash = '#!' + backURI;
	})
	return false;
}

function addInst(forma,uri,backURI){
	this.backURI=backURI;
	//console.log(uri);
	var inputs = $(":input:not(:submit)", forma);
	var obj = $.map(inputs, function(n, i){
		if(n.id.slice(0,2)!="__"){
			var o = {};
			o[n.id] = $(n).val();
			return o;
		}
	});
	//console.log(JSON.stringify(obj));
	serverRequest("POST", uri, [], JSON.stringify(obj), function(statusCode, result, headers){
		location.hash = '#!' + backURI;
	})
	return false;
}

//needs to somehow travel to the servurr...
function filtmerge(branch, fltrs){
	//filters = fltrs.__clone();
	var filters = jQuery.extend(true, [], fltrs);
	var rootURI = '/data/' + branch[1][0];
	
	//filter -> API uri processing
	
	//append uri filters
	for(var i=1;i<branch[2].length;i++){
		if(branch[2][i][0] == 'filt'){
			if(branch[2][i][1][1][0] == undefined){
				branch[2][i][1][1] = branch[1][0];
			}
			//flts = flts + branch[2][i][1][2] + op[branch[2][i][1][0]] + branch[2][i][1][3] + ';';
			filters.push(branch[2][i][1]);
		}
	}
	return filters;
}

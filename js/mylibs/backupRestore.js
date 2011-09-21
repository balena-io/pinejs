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

function backupDB(){
	db.transaction(function (tx) {
		tx.executeSql("SELECT name FROM sqlite_master WHERE type='table';", [],
			function(tx, result){
				for(var i=0;i<result.rows.length;i++){
					tbn = result.rows.item(i).name;
					if(tbn!="__WebKitDatabaseInfoTable__" && tbn.slice(-4)!="_buk"){
						tx.executeSql("DROP TABLE IF EXISTS \"" + tbn + "_buk\";",[],
						function(tx, result){
							//alert("DROP TABLE IF EXISTS \"" + tbn + "_buk\";");
						},function(tx, error){
							alert([error.code, error.message]);
						});
						tx.executeSql("ALTER TABLE \"" + tbn + "\" RENAME TO \"" + tbn + "_buk\";",[],
						function(tx, result){
							//alert("ALTER TABLE \"" + tbn + "\" RENAME TO \"" + tbn + "_buk\";");
						},function(tx, error){
							alert([error.code, error.message]);
						});
					}
				}
			}, 
			null
		);
	});
}

function restoreDB(){
	db.transaction(function (tx) {
		tx.executeSql("SELECT name FROM sqlite_master WHERE type='table';", [],
			function(tx, result){
				for(var i=0;i<result.rows.length;i++){
					tbn = result.rows.item(i).name;
					if(tbn.slice(-4)=="_buk"){
						tx.executeSql("DROP TABLE IF EXISTS \"" + tbn.slice(0,-4) + "\";",[],
						function(tx, result){
							//alert("DROP TABLE IF EXISTS \"" + tbn.slice(0,-4) + "\";");
						},function(tx, error){
							alert([error.code, error.message]);
						});
						tx.executeSql("ALTER TABLE \"" + tbn + "\" RENAME TO \"" + tbn.slice(0,-4) + "\";",[],
						function(tx, result){
							//alert("ALTER TABLE \"" + tbn + "\" RENAME TO \"" + tbn.slice(0,-4) + "\";");
						},function(tx, error){
							alert([error.code, error.message]);
						});
					}
				}
			}, 
			null
		);
	});
}

/**
	@param sqlElem The DOM element into which to put the generated sql using sqlElem.setValue(sqlElem.getValue()+sql), this will be filled asynchronously 
**/
function exportDB(sqlElem) {
	sqlElem.setValue('');
	db.transaction(function (tx) {
		tx.executeSql("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE '%_buk';", [],
			function(tx, result) {
				var query = '';
				for(var i=0;i<result.rows.length;i++) {
					tbn = result.rows.item(i).name;
					query += "DROP TABLE IF EXISTS \"" + tbn + "\";\n";
					query += result.rows.item(i).sql+';\n';
					(function(tbn) {
						db.transaction(function (tx) {
							tx.executeSql('SELECT * FROM "'+tbn+'";', [],
								function(tx, result) {
									var query = '';
									for(var i=0;i<result.rows.length;i++) {
										var currRow = result.rows.item(i), first = true;
										query+='INSERT INTO "'+tbn+'" (';
										for(var propName in currRow) {
											if(!first) {
												query+=',';
											}
											first = false;
											query+='"'+propName+'"';
										}
										query+=') values ('
										first = true;
										for(var propName in currRow) {
											if(!first) {
												query+=',';
											}
											first = false;
											query+="'"+currRow[propName]+"'";
										}
										query+=');\n';
									}
									sqlElem.setValue(sqlElem.getValue()+query);
								},
								function(tx, error){console.log(error);}
							);
						});
					})(tbn);
				}
				sqlElem.setValue(sqlElem.getValue()+query);
			}, 
			function(tx, error){console.log(error);}
		);
	});
}

function clearDB(){
	db.transaction(function (tx) {
		tx.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name !='__WebKitDatabaseInfoTable__';", [],
			function(tx, result){
				for(var i=0;i<result.rows.length;i++){
					tbn = result.rows.item(i).name;
					tx.executeSql("DROP TABLE IF EXISTS \"" + tbn + "\";",[],
					function(tx, result){
						//alert("DROP TABLE IF EXISTS \"" + tbn + "_buk\";");
					},function(tx, error){
						alert([error.code, error.message]);
					});
				}
			}, 
			null
		);
	});
}
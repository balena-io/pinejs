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

function exportDB(){
	db.transaction(function (tx) {
		tx.executeSql("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE '%_buk';", [],
			function(tx, result) {
        var sql = '';
				for(var i=0;i<result.rows.length;i++) {
					tbn = result.rows.item(i).name;
          sql += "DROP TABLE IF EXISTS \"" + tbn + "\";\n";
          sql += result.rows.item(i).sql+'\n';
          (function(tbn) {
            db.transaction(function (tx) {
              tx.executeSql('SELECT * FROM "'+tbn+'";', [],
                function(tx, result) {
                  var sql ='';
                  for(var i=0;i<result.rows.length;i++) {
                    var currRow = result.rows.item(i), first = true;
                    sql+='INSERT INTO "'+tbn+'" (';
                    for(var propName in currRow) {
                      if(!first) {
                        sql+=',';
                      }
                      first = false;
                      sql+='"'+propName+'"';
                    }
                    sql+=') values ('
                    first = true;
                    for(var propName in currRow) {
                      if(!first) {
                        sql+=',';
                      }
                      first = false;
                      sql+="'"+currRow[propName]+"'";
                    }
                    sql+=');\n';
                  }
                  console.log(sql);
                },
                function(tx, error){console.log(error);}
              );
            });
          })(tbn);
				}
        console.log(sql);
			}, 
			function(tx, error){console.log(error);}
		);
	});
}

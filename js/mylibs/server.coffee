
op = 
	eq: "="
	ne: "!="
	lk: "~"

#TODO: the db name needs to be changed
db = openDatabase("mydb", "1.0", "my first database", 2 * 1024 * 1024)

serverModelCache = do () ->
	#This is needed as the switch has no value on first execution. Maybe there's a better way?
	#be warned: localStorage stores all values as strings. 
	#Hence, booleans have to be tested against their string versions.
	#TODO: replace this with db entry. will also solve above issue.
	values = {
		serverOnAir: false
		modelAreaDisabled: false
		se:		""
		lastSE:	""
		lf:		[]
		prepLF:	[]
		sql:		[]
		trans:	[]
	}
	
	db.transaction (tx) ->
		sql = 'CREATE TABLE IF NOT EXISTS "_server_model_cache" (' +
			'"key"	VARCHAR PRIMARY KEY,' +
			'"value"	VARCHAR );'
		tx.executeSql sql, [], (tx, result) ->
		sql = 'SELECT * FROM "_server_model_cache";'
		tx.executeSql sql, [], (tx, result) ->
			for i in [0...result.rows.length]
				row = result.rows.item(i)
				values[row.key] = JSON.parse row.value;
	
	setValue = (key, value) ->
		values[key] = value
		db.transaction (tx) ->
			sql = 'INSERT OR REPLACE INTO "_server_model_cache" values' +
				"('" + key + "','" + JSON.stringify(value).replace(/\\'/g,"\\\\'").replace(new RegExp("'",'g'),"\\'") + "');"
			tx.executeSql sql, [], (tx, result) ->
	
	return {
		isServerOnAir: -> values.serverOnAir
		setServerOnAir: (bool) ->
			setValue 'serverOnAir', bool
		
		isModelAreaDisabled: -> values.modelAreaDisabled
		setModelAreaDisabled: (bool) ->
			setValue 'modelAreaDisabled', bool
	
		getSE: -> values.se
		setSE: (txtmod) ->
			setValue 'se', txtmod
		
		getLastSE: -> values.lastSE
		setLastSE: (txtmod) ->
			setValue 'lastSE', txtmod
		
		getLF: -> values.lf
		setLF: (lfmod) ->
			setValue 'lf', lfmod
		
		getPrepLF: -> values.prepLF
		setPrepLF: (prepmod) ->
			setValue 'prepLF', prepmod
		
		getSQL: -> values.sql
		setSQL: (sqlmod) ->
			setValue 'sql', sqlmod
		
		getTrans: -> values.trans
		setTrans: (trnmod) ->
			setValue 'trans', trnmod
	}


window.remoteServerRequest = (method, uri, headers, body, successCallback, failureCallback, caller) ->
	ftree = []
	tree = ServerURIParser.matchAll(uri, "uri")
	if headers? and headers["Content-Type"] == "application/xml"
			#TODO: in case of input: do something to make xml into a json object
			null
	rootbranch = tree[0].toLowerCase()
	switch rootbranch
		when "onair"
			if method == "GET"
				successCallback "status-line": "HTTP/1.1 200 OK",
					JSON.stringify(serverModelCache.isServerOnAir())
		when "model"
			if method == "GET"
				if serverModelCache.isServerOnAir()
					successCallback "status-line": "HTTP/1.1 200 OK",
						serverModelCache.getLastSE()
				else
					failureCallback? "status-line": "HTTP/1.1 404 Not Found"
		when "lfmodel"
			if method == "GET"
				if serverModelCache.isServerOnAir()
					successCallback "status-line": "HTTP/1.1 200 OK",
						JSON.stringify(serverModelCache.getLF())
				else
					failureCallback? "status-line": "HTTP/1.1 404 Not Found"
		when "prepmodel"
			if method == "GET"
				if serverModelCache.isServerOnAir()
					successCallback "status-line": "HTTP/1.1 200 OK",
						JSON.stringify(serverModelCache.getPrepLF())
				else
					failureCallback? "status-line": "HTTP/1.1 404 Not Found"
		when "sqlmodel"
			if method == "GET"
				if serverModelCache.isServerOnAir()
					successCallback "status-line": "HTTP/1.1 200 OK",
						JSON.stringify(serverModelCache.getSQL())
				else
					failureCallback? "status-line": "HTTP/1.1 404 Not Found"
		when "ui"
			if tree[1][1] == "textarea" and tree[1][3][1][1][3] == "model_area"
				switch method
					when "PUT"
						serverModelCache.setSE JSON.parse(body).value
						successCallback "status-line": "HTTP/1.1 200 OK"
					when "GET"
						successCallback "status-line": "HTTP/1.1 200 OK",
							JSON.stringify(value: serverModelCache.getSE())
			else if tree[1][1] == "textarea-is_disabled" and tree[1][4][1][1][3] == "model_area"
				switch method
					when "PUT"
						serverModelCache.setModelAreaDisabled JSON.parse(body).value
						successCallback "status-line": "HTTP/1.1 200 OK"
					when "GET"
						successCallback "status-line": "HTTP/1.1 200 OK",
							JSON.stringify(value: serverModelCache.isModelAreaDisabled())
		when "execute"
			if method == "POST"
				executePOST tree, headers, body, successCallback, failureCallback, caller
		when "update"
			if method == "POST"
				#update code will go here, based on executePOST
				null
		when "data"
			if serverModelCache.isServerOnAir()
				if tree[1] == undefined
					switch method
						when "GET"
							dataGET tree, headers, body, successCallback, failureCallback, caller
				else if tree[1][1] == "transaction" and method == "GET"
					o = 
						id: tree[1][3][1][1][3]
						tcURI: "/transaction"
						lcURI: "/data/lock"
						tlcURI: "/data/lock-belongs_to-transaction"
						rcURI: "/data/resource"
						lrcURI: "/data/resource-is_under-lock"
						slcURI: "/data/lock-is_shared"
						xlcURI: "/data/lock-is_exclusive"
						ctURI: "/data/transaction*filt:transaction.id=" + tree[1][3][1][1][3] + "/execute"
					
					successCallback "status-line": "HTTP/1.1 200 OK",
						JSON.stringify(o), caller
				else
					switch method
						when "GET"
							console.log "body:[" + body + "]"
							dataplusGET tree, headers, body, successCallback, failureCallback, caller
						when "POST"
							dataplusPOST tree, headers, body, successCallback, failureCallback, caller
						when "PUT"
							dataplusPUT tree, headers, body, successCallback, failureCallback, caller
						when "DELETE"
							dataplusDELETE tree, headers, body, successCallback, failureCallback, caller
			else
				failureCallback? "status-line": "HTTP/1.1 404 Not Found"
		else
			if method == "DELETE"
				rootDELETE tree, headers, body, successCallback, failureCallback, caller


dataplusDELETE = (tree, headers, body, successCallback, failureCallback, caller) ->
	id = getID tree
	if id != 0
		if tree[1][1] == "lock" and hasCR tree
			#CR posted to Lock
			#insert delete entry
			db.transaction (tx) ->
				sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id
				tx.executeSql sql, [], (tx, result) ->
				
				sql = "INSERT INTO 'conditional_representation'('lock_id','field_name','field_type','field_value')" +
					 "VALUES ('" + id + "','__DELETE','','')"
				tx.executeSql sql, [], (tx, result) ->
		else
			db.transaction ((tx) ->
				sql = "SELECT NOT EXISTS(SELECT * FROM 'resource-is_under-lock' AS r " + "WHERE r.'resource_type'=='" + tree[1][1] + "' " + "AND r.'resource_id'==" + id + ") AS result;"
				tx.executeSql sql, [], (tx, result) ->
					if result.rows.item(0).result == 1
						sql = 'DELETE FROM "' + tree[1][1] + '" WHERE id=' + id + ";"
						tx.executeSql sql, [], (tx, result) ->
							validateDB tx, serverModelCache.getSQL(), caller, ((tx, sqlmod, caller, failureCallback, headers, result) ->
								successCallback headers, result, caller
							), failureCallback, "status-line": "HTTP/1.1 200 OK", ""
					else
						failureCallback [ "The resource is locked and cannot be deleted" ]
			), (err) ->
			
			
dataplusPUT = (tree, headers, body, successCallback, failureCallback, caller) ->
	id = getID tree
	if tree[1][1] == "lock" and hasCR tree
		#CR posted to Lock
		bd = JSON.parse(body)
		ps = []
		for own pair of bd
			for own k of bd[pair]
				ps.push [ id, k, typeof bd[pair][k], bd[pair][k] ]
					
		#sql="INSERT INTO 'conditional_representation'('lock_id','field_name','field_type','field_value')"
		#"VALUES ('','','','')"
		db.transaction (tx) ->
			sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id
			tx.executeSql sql, [], (tx, result) ->
			
			for own item of ps
				sql = "INSERT INTO 'conditional_representation'('lock_id'," +
					"'field_name','field_type','field_value')" +
					"VALUES ('" + ps[item][0] + "','" + ps[item][1] + "','" +
					ps[item][2] + "','" + ps[item][3] + "')"
				tx.executeSql sql, [], (tx, result) ->
	else
		errs = []
		db.transaction ((tx) ->
			sql = "SELECT NOT EXISTS(SELECT * FROM 'resource-is_under-lock' AS r WHERE r.'resource_type'=='" + tree[1][1] + "' AND r.'resource_id'==" + id + ") AS result;"
			tx.executeSql sql, [], (tx, result) ->
				if result.rows.item(0).result == 1
					if id != ""
						bd = JSON.parse(body)
						ps = []
						for own pair of bd
							for own k of bd[pair]
								ps.push k + "=" + JSON.stringify(bd[pair][k])
						sql = 'UPDATE "' + tree[1][1] + '" SET ' + ps.join(",") + " WHERE id=" + id + ";"
						tx.executeSql sql, [], (tx) ->
							validateDB tx, serverModelCache.getSQL(), caller, ((tx, sqlmod, caller, failureCallback, headers, result) ->
								successCallback headers, result, caller
							), failureCallback, "status-line": "HTTP/1.1 200 OK", ""
				else
					failureCallback [ "The resource is locked and cannot be edited" ]
		), (err) ->


dataplusPOST = (tree, headers, body, successCallback, failureCallback, caller) ->
	#figure out if it's a POST to transaction/execute
	if tree[1][1] == "transaction" and isExecute tree
		id = getID tree

		#get all locks of transaction
		db.transaction ((tx) ->
			sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";"
			tx.executeSql sql, [], (tx, locks) ->
				endLock tx, locks, 0, id, caller, successCallback, failureCallback
		), (error) ->
			db.transaction (tx) ->
				sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";"
				tx.executeSql sql, [], (tx, locks) ->
					#for each lock, do cleanup
					i = 0
					while i < locks.rows.length
						lock_id = locks.rows.item(0).lock_id
						sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + lock_id + ";"
						console.log sql
						tx.executeSql sql, [], (tx, result) ->
						
						sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=' + lock_id + ";"
						console.log sql
						tx.executeSql sql, [], (tx, result) ->
						
						sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=' + lock_id + ";"
						console.log sql
						tx.executeSql sql, [], (tx, result) ->
						
						sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=' + lock_id + ";"
						console.log sql
						tx.executeSql sql, [], (tx, result) ->
						
						sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=' + lock_id + ";"
						console.log sql
						tx.executeSql sql, [], (tx, result) ->
						
						sql = 'DELETE FROM "lock" WHERE "id"=' + lock_id + ";"
						console.log sql
						tx.executeSql sql, [], (tx, result) ->
						i++
					sql = 'DELETE FROM "transaction" WHERE "id"=' + id + ";"
					console.log sql
					tx.executeSql sql, [], (tx, result) ->
	else
		bd = JSON.parse(body)
		fds = []
		vls = []
		for own pair of bd
			for own k of bd[pair]
				fds.push k
				vls.push JSON.stringify(bd[pair][k])
		sql = 'INSERT INTO "' + tree[1][1] + '"("' + fds.join('","') + '") VALUES (' + vls.join(",") + ");"
		db.transaction (tx) ->
			tx.executeSql sql, [], (tx, result) ->
				validateDB tx, serverModelCache.getSQL(), caller, ((tx, sqlmod, caller, failureCallback, headers, result) ->
					successCallback headers, result, caller
				), failureCallback, 
					"status-line": "HTTP/1.1 201 Created"
					location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + result.insertId
				, ""


executePOST = (tree, headers, body, successCallback, failureCallback, caller) ->
	se = serverModelCache.getSE()
	lfmod = SBVRParser.matchAll(se, "expr")
	console.log lfmod
	prepmod = SBVR_PreProc.match(lfmod, "optimizeTree")
	sqlmod = SBVR2SQL.match(prepmod, "trans")
	tree = SBVRParser.matchAll(modelT, "expr")
	tree = SBVR_PreProc.match(tree, "optimizeTree")
	trnmod = SBVR2SQL.match(tree, "trans")
	serverModelCache.setModelAreaDisabled true
	db.transaction (tx) ->
		executeSasync tx, sqlmod, caller, ((tx, sqlmod, caller, failureCallback, headers, result) ->
			#TODO: fix this as soon as the successCalback mess is fixed
			executeTasync tx, trnmod, caller, ((tx, trnmod, caller, failureCallback, headers, result) ->
				serverModelCache.setServerOnAir true
				serverModelCache.setLastSE se
				serverModelCache.setLF lfmod
				serverModelCache.setPrepLF prepmod
				serverModelCache.setSQL sqlmod
				serverModelCache.setTrans trnmod
				successCallback headers, result
			), failureCallback, headers, result
		), ((errors) ->
			serverModelCache.setModelAreaDisabled false
			failureCallback errors
		), "status-line": "HTTP/1.1 200 OK"


rootDELETE = (tree, headers, body, successCallback, failureCallback, caller) ->
	#TODO: This should be reorganised to be properly async.
	db.transaction ((sqlmod) ->
		(tx) ->
			for row in sqlmod[1..]
				tx.executeSql row[5] if row[0] in ["fcTp", "term"]
	)(serverModelCache.getSQL())
	db.transaction ((trnmod) ->
		(tx) ->
			for row in trnmod[1..]
				tx.executeSql row[5] if row[0] in ["fcTp", "term"]
	)(serverModelCache.getTrans())
	#TODO: these two do not belong here
	serverModelCache.setSE ""
	serverModelCache.setModelAreaDisabled false
	
	serverModelCache.setLastSE ""
	serverModelCache.setPrepLF []
	serverModelCache.setLF []
	serverModelCache.setSQL []
	serverModelCache.setTrans []
	serverModelCache.setServerOnAir false

	successCallback "status-line": "HTTP/1.1 200 OK", ""


dataGET = (tree, headers, body, successCallback, failureCallback, caller) ->
	result = 
		terms: []
		fcTps: []
	sqlmod = serverModelCache.getSQL()
	
	for row in sqlmod[1..]
		if row[0] == "term"
			result.terms.push 
				id: row[1]
				name: row[2]
		else if row[0] == "fcTp"
			result.fcTps.push 
				id: row[1]
				name: row[2]
	
	successCallback "status-line": "HTTP/1.1 200 OK",
		JSON.stringify(result), caller


dataplusGET = (tree, headers, body, successCallback, failureCallback, caller) ->
	ftree = getFTree tree
	db.transaction (tx) ->
		sql = ""
		if tree[1][0] == "term"
			sql = "SELECT " + "*" + " FROM " + tree[1][1]
			sql += " WHERE " unless ftree.length == 1
		else if tree[1][0] == "fcTp"
			ft = tree[1][1]
			fl = [ "'" + ft + "'.id AS id" ]
			jn = []
			tb = [ "'" + ft + "'" ]
			
			for row in tree[1][2][1..]
				fl.push "'" + row + "'" + ".'id' AS '" + row + "_id'"
				fl.push "'" + row + "'" + ".'name' AS '" + row + "_name'"
				tb.push "'" + row + "'"
				jn.push "'" + row + "'" + ".'id' = " + "'" + ft + "'" + "." + "'" + row + "_id" + "'"
			
			sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ")
			sql += " AND "  unless ftree.length == 1
		if ftree.length != 1
			filts = []
			
			for row in ftree[1..]
				if row[0] == "filt"
					for row2 in row[1..]
						obj = ""
						obj = "'" + row2[1] + "'" + "." if row2[1][0]?
						filts.push obj + "'" + row2[2] + "'" + op[row2[0]] + row2[3]
				else if row[0] == "sort"
					#process sort
					null
			sql += filts.join(" AND ")
		if sql != ""
			tx.executeSql sql + ";", [], (tx, result) ->
				reslt = {}
				ents = []
				i = 0
				
				while i < result.rows.length
					ents.push result.rows.item(i)
					i++
				reslt["instances"] = ents
				successCallback "status-line": "HTTP/1.1 200 OK",
					JSON.stringify(reslt), caller



endLock = (tx, locks, i, trans_id, caller, successCallback, failureCallback) ->
	#get conditional representations (if exist)
	lock_id = locks.rows.item(i).lock_id
	sql = 'SELECT * FROM "conditional_representation" WHERE "lock_id"=' + lock_id + ';'
	tx.executeSql sql, [], (tx, crs) ->
		#find which resource is under this lock
		sql = 'SELECT * FROM "resource-is_under-lock" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';'
		tx.executeSql sql, [], (tx, locked) ->
			if crs.rows.item(0).field_name == "__DELETE"
				#delete said resource
				sql = 'DELETE FROM "' + locked.rows.item(0).resource_type
				sql += '" WHERE "id"=' + locked.rows.item(0).resource_id
				tx.executeSql sql + ";", [], (tx, result) ->
					if i < locks.rows.length - 1
						endLock tx, locks, i + 1, trans_id, caller, successCallback, failureCallback
					else
						#delete transaction
						sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';'
						tx.executeSql sql, [], (tx, result) ->
						
						validateDB tx, serverModelCache.getSQL(), caller, ((tx, sqlmod, caller, failureCallback, headers, result) ->
							successCallback headers, result, caller
						), failureCallback, "status-line": "HTTP/1.1 200 OK", ""
			else
				#commit conditional_representation
				sql = "UPDATE \"" + locked.rows.item(0).resource_type + "\" SET "
				j = 0
				
				while j < crs.rows.length
					sql += '"' + crs.rows.item(j).field_name + '"='
					if crs.rows.item(j).field_type == "string"
						sql += '"' + crs.rows.item(j).field_value + '"'
					else
						sql += crs.rows.item(j).field_value
					sql += ", "  if j < crs.rows.length - 1
					j++
				sql += ' WHERE "id"=' + locked.rows.item(0).resource_id + ';'
				tx.executeSql sql, [], (tx, result) ->
					if i < locks.rows.length - 1
						endLock tx, locks, i + 1, trans_id, caller, successCallback, failureCallback
					else
						sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';'
						tx.executeSql sql, [], (tx, result) ->
							console.log "t ok"
						
						validateDB tx, serverModelCache.getSQL(), caller, ((tx, sqlmod, caller, failureCallback, headers, result) ->
							successCallback headers, result, caller
						), failureCallback, "status-line": "HTTP/1.1 200 OK", ""
			sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';'
			tx.executeSql sql, [], (tx, result) ->
				console.log "cr ok"
			
			sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';'
			tx.executeSql sql, [], (tx, result) ->
				console.log "rl ok"
	
	sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=' + lock_id + ';'
	tx.executeSql sql, [], (tx, result) ->
		console.log "ls ok"
	
	sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=' + lock_id + ';'
	tx.executeSql sql, [], (tx, result) ->
		console.log "le ok"
	
	sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=' + lock_id + ';'
	tx.executeSql sql, [], (tx, result) ->
		console.log "lt ok"
	
	sql = "DELETE FROM \"lock\" WHERE \"id\"=" + lock_id
	tx.executeSql sql + ";", [], (tx, result) ->
		console.log "l ok"


validateDB = (tx, sqlmod, caller, successCallback, failureCallback, headers, result) ->
	k = 0
	m = 0
	l = []
	errors = []
	par = 1
	tot = 0
	tex = 0
	
	for row in sqlmod
		if row[0] == "rule"
			query = row[4]
			tot++
			l[tot] = row[2]
			tx.executeSql query, [], (tx, result) ->
				tex++
				errors.push l[tex]  if result.rows.item(0).result == 0
				par *= result.rows.item(0).result
				if tot == tex
					if par == 0
						failureCallback errors
						#bogus sql to raise exception
						tx.executeSql "DROP TABLE '__Fo0oFoo'"
					else
						successCallback tx, sqlmod, caller, failureCallback, headers, result
	successCallback tx, sqlmod, caller, failureCallback, headers, result  if tot == 0


executeSasync = (tx, sqlmod, caller, successCallback, failureCallback, headers, result) ->
	k = 0
	m = 0
	l = []
	
	#Create tables related to terms and fact types
	for row in sqlmod
		tx.executeSql row[4] if row[0] in ["fcTp", "term"]
		
	#Validate the [empty] model according to the rules. 
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	validateDB tx, sqlmod, caller, successCallback, failureCallback, headers, ""


executeTasync = (tx, trnmod, caller, successCallback, failureCallback, headers, result) ->
	#Execute transaction model.
	executeSasync tx, trnmod, caller, ((tx, trnmod, caller, failureCallback, headers, result) ->
		#Hack: Add certain attributes to the transaction model tables. 
		#This should eventually be done with SBVR, when we add attributes.
		tx.executeSql "ALTER TABLE 'resource-is_under-lock' ADD COLUMN resource_type TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN field_name TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN field_value TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN field_type TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN lock_id TEXT", []
		successCallback tx, trnmod, caller, failureCallback, headers, result
	), ((errors) ->
		serverModelCache.setModelAreaDisabled false
		failureCallback errors
	), headers, result


updateRules = (sqlmod) ->
	#Create tables related to terms and fact types
	#if not exists clause makes sure table is not double-created,
	#tho this should be dealt with more elegantly.
	for row in sqlmod
		tx.executeSql row[4] if row[0] in ["fcTp", "term"]
	
	#Validate the [empty] model according to the rules. 
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	for row in sqlmod
		if row[0] == "rule"
			query = row[4]
			l[++m] = row[2]
			tx.executeSql query, [], ((tx, result) ->
				alert "Error: " + l[++k]  if result.rows.item(0)["result"] == 0
			), null
		
getFTree = (tree) ->
	if tree[1][0] == "term"
		return tree[1][3]
	else if tree[1][0] == "fcTp"
		return tree[1][4]
	return []

getID = (tree) ->
	if tree[1][0] == "term"
		id = tree[1][2]
	else if tree[1][0] == "fcTp"
		id = tree[1][3]
	id = 0 if id == ""
	#if the id is empty, search the filters for one
	if id is 0
		ftree = getFTree tree
		for f in ftree[1..]
			if f[0] == "filt" and f[1][0] == "eq" and f[1][2] == "id"
					return f[1][3]
	return id

hasCR = (tree) ->
	#figure out if this is a CR posted to a Lock
	for f in getFTree tree
		if f[0] == "cr"
			return true
	return false

isExecute = (tree) ->
	for f in getFTree tree
		if f[0] == "execute"
			return true
	return false
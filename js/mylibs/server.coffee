op = 
	eq: "="
	ne: "!="
	lk: "~"

#TODO: the db name needs to be changed
if process?
	requirejs = require('requirejs');
	requirejs.config(
		nodeRequire: require
		baseUrl: 'js'
	)
	db = do () ->
		Client = new require('pg').Client
		_db = new Client("postgres://postgres:.@localhost:5432/postgres")
		result = (rows) ->
			return {
				rows: {
					length: rows?.length or 0
					item: (i) -> rows[i]
				}
			}
		tx = {
			executeSql: (sql, bindings, callback, errorCallback) ->
				_db.query sql, (err, res) ->
					if err?
						errorCallback? err
						console.log(sql, err)
					else
						callback? tx, result(res.rows)
			begin: -> tx.executeSql('BEGIN;')
			end: -> tx.executeSql('END;')
			rollback: -> tx.executeSql('ROLLBACK;')
		}
		return {
			transaction: (callback) ->
				callback(tx)
		}
		
	# db = do () ->
		# sqlite3 = require('sqlite3').verbose();
		# _db = new sqlite3.Database('/tmp/mydb.db');
		# result = (rows) ->
			# return {
				# rows: {
					# length: rows?.length or 0
					# item: (i) -> rows[i]
				# }
			# }
		# tx = {
			# executeSql: (sql, bindings, callback, errorCallback) ->
				# _db.all sql, bindings ? [], (err, rows) ->
					# if err?
						# errorCallback? err
						# console.log(sql, err)
					# else
						# callback? tx, result(rows)
			# begin: -> tx.executeSql('BEGIN;')
			# end: -> tx.executeSql('END;')
			# rollback: -> tx.executeSql('ROLLBACK;')
		# }
		# return {
			# transaction: (callback) ->
				# _db.serialize () ->
					# callback(tx)
		# }
else
	requirejs = window.requirejs
	db = do () ->
		_db = openDatabase("mydb", "1.0", "my first database", 2 * 1024 * 1024)
		tx = (_tx) ->
			return {
				executeSql: (sql, bindings, callback, errorCallback) ->
					thisTX = this
					#Wrap the callbacks passed in with our own if necessary to pass in the wrapped tx.
					if callback?
						callback = do(callback) ->
							(_tx, _results) ->
								callback(thisTX, _results)
					if errorCallback?
						errorCallback = do(errorCallback) ->
							(_tx, _err) ->
								errorCallback(thisTX, _err)
					_tx.executeSql(sql, bindings, callback, errorCallback)
				begin: ->
				end: ->
				rollback: -> tx.executeSql("DROP TABLE '__Fo0oFoo'")
			}
		return {
			transaction: (callback) ->
				_db.transaction( (_tx) ->
					callback(tx(_tx))
				)
		}
requirejs(["libs/inflection",
		"../ometa-js/lib",
		"../ometa-js/ometa-base"]);
requirejs([
	"mylibs/ometa-code/SBVRModels",
	"mylibs/ometa-code/SBVRParser",
	"mylibs/ometa-code/SBVR_PreProc",
	"mylibs/ometa-code/SBVR2SQL",
	"mylibs/ometa-code/ServerURIParser"]
);


serverModelCache = do () ->
	#This is needed as the switch has no value on first execution. Maybe there's a better way?
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
		tx.executeSql 'CREATE TABLE IF NOT EXISTS "_server_model_cache" (' +
					'"key"	VARCHAR PRIMARY KEY,' +
					'"value"	VARCHAR );'
		tx.executeSql 'SELECT * FROM "_server_model_cache";', [], (tx, result) ->
			for i in [0...result.rows.length]
				row = result.rows.item(i)
				values[row.key] = JSON.parse row.value;

	setValue = (key, value) ->
		values[key] = value
		db.transaction (tx) ->
			tx.executeSql 'INSERT OR REPLACE INTO "_server_model_cache" values' +
						"('" + key + "','" + JSON.stringify(value).replace(/\\'/g,"\\\\'").replace(new RegExp("'",'g'),"\\'") + "');"

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

handlers =
	onair:
		GET: (successCallback, failureCallback) ->
			successCallback 200, serverModelCache.isServerOnAir()
	model:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getLastSE()
		]
	lfmodel:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getLF()
		]
	prepmodel:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getPrepLF()
		]
	sqlmodel:
		GET: [
			-> serverModelCache.isServerOnAir()
			(successCallback, failureCallback) ->
				successCallback 200, serverModelCache.getSQL()
		]
	update:
		POST: (successCallback, failureCallback) ->
			#update code will go here, based on executePOST
			failureCallback 404
	ui:
		GET: [
			[
				(tree) -> tree[1][1] == "textarea" and tree[1][3][1][1][3] == "model_area"
				(successCallback, failureCallback) ->
					successCallback 200, value: serverModelCache.getSE()
			]
			[
				(tree) -> tree[1][1] == "textarea-is_disabled" and tree[1][4][1][1][3] == "model_area"
				(successCallback, failureCallback) ->
					successCallback 200, value: serverModelCache.isModelAreaDisabled()
			]
		]
		PUT: [
			[
				(tree) -> tree[1][1] == "textarea" and tree[1][3][1][1][3] == "model_area"
				(successCallback, failureCallback, body) ->
					serverModelCache.setSE( JSON.parse(body).value )
					successCallback 200
			]
			[
				(tree) -> tree[1][1] == "textarea-is_disabled" and tree[1][4][1][1][3] == "model_area"
				(successCallback, failureCallback, body) ->
					serverModelCache.setModelAreaDisabled( JSON.parse(body).value )
					successCallback 200
			]
		]
	execute:
		POST: (successCallback, failureCallback) ->
			se = serverModelCache.getSE()
			try
				lfmod = SBVRParser.matchAll(se, "expr")
			catch e
				console.log 'Error parsing model', e
				failureCallback 404, 'Error parsing model'
				return null
			prepmod = SBVR_PreProc.match(lfmod, "optimizeTree")
			sqlmod = SBVR2SQL.match(prepmod, "trans")
			tree = SBVRParser.matchAll(modelT, "expr")
			tree = SBVR_PreProc.match(tree, "optimizeTree")
			trnmod = SBVR2SQL.match(tree, "trans")
			serverModelCache.setModelAreaDisabled true
			db.transaction (tx) ->
				tx.begin()
				executeSasync tx, sqlmod, ((tx, sqlmod, failureCallback, result) ->
					#TODO: fix this as soon as the successCallback mess is fixed
					executeTasync tx, trnmod, ((tx, trnmod, failureCallback, result) ->
						serverModelCache.setServerOnAir true
						serverModelCache.setLastSE se
						serverModelCache.setLF lfmod
						serverModelCache.setPrepLF prepmod
						serverModelCache.setSQL sqlmod
						serverModelCache.setTrans trnmod
						successCallback 200, result
					), failureCallback, result
				), ((errors) ->
					serverModelCache.setModelAreaDisabled false
					failureCallback 404, errors
				)

# successCallback = (statusCode, result, headers)
# failureCallback = (statusCode, errors, headers)
remoteServerRequest = (method, uri, headers, body, successCallback, failureCallback) ->
	if typeof successCallback != "function"
		successCallback = ->
	if typeof failureCallback != "function"
		failureCallback = ->

	tree = ServerURIParser.matchAll(uri, "uri")
	if headers? and headers["Content-Type"] == "application/xml"
			#TODO: in case of input: do something to make xml into a json object
			null
	execHandle = (handle) ->
		handle(successCallback, failureCallback, body)
	execFilterHandle = (filterHandle) ->
		if filterHandle[0](tree)
			execHandle(filterHandle[1])
			return true
		return false
	
	rootbranch = tree[0].toLowerCase()
	if handlers[rootbranch]?
		if handlers[rootbranch][method]?
			if typeof handlers[rootbranch][method] == 'function'
				execHandle(handlers[rootbranch][method])
			else
				if handlers[rootbranch][method].constructor.name == 'Array'
					if handlers[rootbranch][method][0].constructor.name == 'Array'
						for filterHandle in handlers[rootbranch][method]
							return if execFilterHandle(filterHandle)
					else if !execFilterHandle(handlers[rootbranch][method])
						failureCallback 404
				else
					throw new Exception('Incorrect handler setup: ', rootbranch, method)
		else
			failureCallback 404
		return
	switch rootbranch
		when "data"
			if serverModelCache.isServerOnAir()
				if tree[1] == undefined
					switch method
						when "GET"
							dataGET tree, headers, body, successCallback, failureCallback
						else
							failureCallback 404
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

					successCallback 200, o
				else
					switch method
						when "GET"
							#console.log "body:[" + body + "]"
							dataplusGET tree, headers, body, successCallback, failureCallback
						when "POST"
							dataplusPOST tree, headers, body, successCallback, failureCallback
						when "PUT"
							dataplusPUT tree, headers, body, successCallback, failureCallback
						when "DELETE"
							dataplusDELETE tree, headers, body, successCallback, failureCallback
						else
							failureCallback 404
		else
			if method == "DELETE"
				rootDELETE tree, headers, body, successCallback, failureCallback
			else
				failureCallback 404

dataplusDELETE = (tree, headers, body, successCallback, failureCallback) ->
	id = getID tree
	if id != 0
		if tree[1][1] == "lock" and hasCR tree
			#CR posted to Lock
			#insert delete entry
			db.transaction (tx) ->
				tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id
				tx.executeSql "INSERT INTO 'conditional_representation'('lock_id','field_name','field_type','field_value')" +
							"VALUES ('" + id + "','__DELETE','','')"
		else
			db.transaction ((tx) ->
				sql = "SELECT NOT EXISTS(SELECT * FROM 'resource-is_under-lock' AS r " + "WHERE r.'resource_type'=='" + tree[1][1] + "' " + "AND r.'resource_id'==" + id + ") AS result;"
				tx.executeSql sql, [], (tx, result) ->
					if result.rows.item(0).result == 1
						tx.begin()
						sql = 'DELETE FROM "' + tree[1][1] + '" WHERE id=' + id + ";"
						tx.executeSql sql, [], (tx, result) ->
							validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
								tx.end()
								successCallback 200, result
							), failureCallback
					else
						failureCallback 404, [ "The resource is locked and cannot be deleted" ]
			), (err) ->


dataplusPUT = (tree, headers, body, successCallback, failureCallback) ->
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
			tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id

			for own item of ps
				sql = "INSERT INTO 'conditional_representation'('lock_id'," +
					"'field_name','field_type','field_value')" +
					"VALUES ('" + ps[item][0] + "','" + ps[item][1] + "','" +
					ps[item][2] + "','" + ps[item][3] + "')"
				tx.executeSql sql, [], (tx, result) ->
	else
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
						tx.begin()
						sql = 'UPDATE "' + tree[1][1] + '" SET ' + ps.join(",") + " WHERE id=" + id + ";"
						tx.executeSql sql, [], (tx) ->
							validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
								tx.end()
								successCallback 200, result
							), failureCallback
				else
					failureCallback 404, [ "The resource is locked and cannot be edited" ]
		), (err) ->


dataplusPOST = (tree, headers, body, successCallback, failureCallback) ->
	#figure out if it's a POST to transaction/execute
	if tree[1][1] == "transaction" and isExecute tree
		id = getID tree

		#get all locks of transaction
		db.transaction ((tx) ->
			sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";"
			tx.executeSql sql, [], (tx, locks) ->
				endLock tx, locks, 0, id, successCallback, failureCallback
		), (error) ->
			db.transaction (tx) ->
				sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";"
				tx.executeSql sql, [], (tx, locks) ->
					#for each lock, do cleanup
					for i in [0...locks.rows.length]
						lock_id = locks.rows.item(i).lock_id
						sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + lock_id + ";"
						tx.executeSql sql, [], (tx, result) ->

						sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=' + lock_id + ";"
						tx.executeSql sql, [], (tx, result) ->

						sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=' + lock_id + ";"
						tx.executeSql sql, [], (tx, result) ->

						sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=' + lock_id + ";"
						tx.executeSql sql, [], (tx, result) ->

						sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=' + lock_id + ";"
						tx.executeSql sql, [], (tx, result) ->

						sql = 'DELETE FROM "lock" WHERE "id"=' + lock_id + ";"
						tx.executeSql sql, [], (tx, result) ->
					sql = 'DELETE FROM "transaction" WHERE "id"=' + id + ";"
					tx.executeSql sql, [], (tx, result) ->
	else
		bd = JSON.parse(body)
		fds = []
		vls = []
		for own pair of bd
			for own k of bd[pair]
				fds.push k
				vls.push JSON.stringify(bd[pair][k])
		db.transaction (tx) ->
			tx.begin()
			sql = 'INSERT INTO "' + tree[1][1] + '"("' + fds.join('","') + '") VALUES (' + vls.join(",") + ");"
			tx.executeSql sql, [], (tx, sqlResult) ->
				validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, headers, result) ->
					successCallback 201, result,
						location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + sqlResult.insertId
				), failureCallback


rootDELETE = (tree, headers, body, successCallback, failureCallback) ->
	#TODO: This should be reorganised to be properly async.
	db.transaction ((sqlmod) ->
		(tx) ->
			for row in sqlmod[1..] when row[0] in ["fcTp", "term"]
				tx.executeSql row[5]
	)(serverModelCache.getSQL())
	db.transaction ((trnmod) ->
		(tx) ->
			for row in trnmod[1..] when row[0] in ["fcTp", "term"]
				tx.executeSql row[5]
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

	successCallback 200


dataGET = (tree, headers, body, successCallback, failureCallback) ->
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

	successCallback 200, result


dataplusGET = (tree, headers, body, successCallback, failureCallback) ->
	ftree = getFTree tree
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
		sql += " AND " unless ftree.length == 1
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
		db.transaction (tx) ->
			tx.executeSql sql + ";", [], (tx, result) ->
				data = instances: result.rows.item(i) for i in [0...result.rows.length]
				successCallback 200, data


endLock = (tx, locks, i, trans_id, successCallback, failureCallback) ->
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
						endLock tx, locks, i + 1, trans_id, successCallback, failureCallback
					else
						#delete transaction
						tx.executeSql 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';'

						validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
							successCallback 200, result
						), failureCallback
			else
				#commit conditional_representation
				sql = "UPDATE \"" + locked.rows.item(0).resource_type + "\" SET "

				for j in [0...crs.rows.length]
					item = crs.rows.item(j);
					sql += '"' + item.field_name + '"='
					if item.field_type == "string"
						sql += '"' + item.field_value + '"'
					else
						sql += item.field_value
					sql += ", " if j < crs.rows.length - 1
				sql += ' WHERE "id"=' + locked.rows.item(0).resource_id + ';'
				tx.executeSql sql, [], (tx, result) ->
					if i < locks.rows.length - 1
						endLock tx, locks, i + 1, trans_id, successCallback, failureCallback
					else
						sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';'
						tx.executeSql sql

						validateDB tx, serverModelCache.getSQL(), ((tx, sqlmod, failureCallback, result) ->
							successCallback 200, result
						), failureCallback
			sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';'
			tx.executeSql sql

			sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';'
			tx.executeSql sql

	sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=' + lock_id + ';'
	tx.executeSql sql

	sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=' + lock_id + ';'
	tx.executeSql sql

	sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=' + lock_id + ';'
	tx.executeSql sql

	sql = 'DELETE FROM "lock" WHERE "id"=' + lock_id + ';'
	tx.executeSql sql

# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
validateDB = (tx, sqlmod, successCallback, failureCallback) ->
	l = []
	errors = []
	par = 1
	tot = 0
	tex = 0

	for row in sqlmod when row[0] == "rule"
		query = row[4]
		tot++
		l[tot] = row[2]
		tx.executeSql query, [], (tx, result) ->
			tex++
			errors.push l[tex] if result.rows.item(0).result == 0
			par *= result.rows.item(0).result
			if tot == tex
				if par == 0
					failureCallback 404, errors
					tx.rollback()
				else
					tx.end()
					successCallback tx, sqlmod, failureCallback, result
	successCallback tx, sqlmod, failureCallback, "" if tot == 0


# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
executeSasync = (tx, sqlmod, successCallback, failureCallback, result) ->
	#Create tables related to terms and fact types
	for row in sqlmod
		tx.executeSql row[4] if row[0] in ["fcTp", "term"]

	#Validate the [empty] model according to the rules. 
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	validateDB tx, sqlmod, successCallback, failureCallback


# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
executeTasync = (tx, trnmod, successCallback, failureCallback, result) ->
	#Execute transaction model.
	executeSasync tx, trnmod, ((tx, trnmod, failureCallback, result) ->
		#Hack: Add certain attributes to the transaction model tables. 
		#This should eventually be done with SBVR, when we add attributes.
		tx.executeSql "ALTER TABLE 'resource-is_under-lock' ADD COLUMN resource_type TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN field_name TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN field_value TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN field_type TEXT", []
		tx.executeSql "ALTER TABLE 'conditional_representation' ADD COLUMN lock_id TEXT", []
		successCallback tx, trnmod, failureCallback, result
	), ((errors) ->
		serverModelCache.setModelAreaDisabled false
		failureCallback 404, errors
	), result


updateRules = (sqlmod) ->
	#Create tables related to terms and fact types
	#if not exists clause makes sure table is not double-created,
	#tho this should be dealt with more elegantly.
	for row in sqlmod
		tx.executeSql row[4] if row[0] in ["fcTp", "term"]

	#Validate the [empty] model according to the rules. 
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	for row in sqlmod when row[0] == "rule"
		query = row[4]
		l[++m] = row[2]
		tx.executeSql query, [], ((tx, result) ->
			alert "Error: " + l[++k] if result.rows.item(0)["result"] == 0
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
		for f in ftree[1..] when f[0] == "filt" and
							f[1][0] == "eq" and f[1][2] == "id"
			return f[1][3]
	return id

hasCR = (tree) ->
	#figure out if this is a CR posted to a Lock
	for f in getFTree tree
		if f[0] == "cr"
			return true
	return false

isExecute = (tree) ->
	for f in getFTree tree when f[0] == "execute"
			return true
	return false

if process?
	staticServer = new(require('node-static').Server)('./');
	http = require('http')
	http.createServer((request, response) ->
		console.log("Request received")
		body = ''
		request.on('data', (chunk) ->
			body += chunk
			#console.log('Chunk', chunk)
		)
		request.on('end', () ->
			console.log('End', request.method, request.url, body)
			nodePath = '/node'
			if nodePath == request.url[0...nodePath.length]
				console.log('Node')
				remoteServerRequest(request.method, request.url[nodePath.length..], request.headers, body,
					(statusCode, result = "", headers) ->
						console.log('Success', result)
						response.writeHead(statusCode, headers)
						response.end(JSON.stringify(result))
					(statusCode, errors, headers) ->
						console.log('Error', errors, new Error().stack)
						response.writeHead(statusCode, headers)
						response.end(JSON.stringify(errors))
				)
			else
				console.log('Static')
				staticServer.serve(request, response)
				
		)
	).listen(process.env.PORT or 1337, () ->
		console.log('Server started')
	)


# @param sql The SQL queries to import.
importDB = (sql) ->
	queries = sql.split(";")
	db.transaction (tx) ->
		for query in queries when query.trim().length > 0
			do (query) ->
				tx.executeSql query, [], ((tx, result) ->
					console.log "Import Success"
				), (tx, error) ->
					console.log query
					console.log error


exportDB = (sqlElem) ->
	sqlElem.setValue ""
	db.transaction (tx) ->
		tx.executeSql "SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE '%_buk';", [], ((tx, result) ->
			query = ""
			for i in [0...result.rows.length]
				tbn = result.rows.item(i).name
				query += 'DROP TABLE IF EXISTS "' + tbn + '";\n'
				query += result.rows.item(i).sql + ";\n"
				do (tbn) ->
					db.transaction (tx) ->
						tx.executeSql 'SELECT * FROM "' + tbn + '";', [], ((tx, result) ->
							insQuery = ""
							for i in [0...result.rows.length]
								currRow = result.rows.item(i)
								notFirst = false
								insQuery += 'INSERT INTO "' + tbn + '" ('
								valQuery = ''
								for own propName of currRow
									if notFirst
										insQuery += ","
										valQuery += ","
									else
										notFirst = true
									insQuery += '"' + propName + '"'
									valQuery += "'" + currRow[propName] + "'"
								insQuery += ") values (" + valQuery + ");\n"
							sqlElem.setValue(sqlElem.getValue() + insQuery)
						)
			sqlElem.setValue(sqlElem.getValue() + query)
		)


backupDB = ->
	db.transaction (tx) ->
		tx.executeSql("SELECT name FROM sqlite_master WHERE type='table';", [], (tx, result) ->
			for i in [0...result.rows.length]
				tbn = result.rows.item(i).name
				if tbn != '__WebKitDatabaseInfoTable__' and tbn.slice(-4) != "_buk"
					tx.executeSql 'DROP TABLE IF EXISTS "' + tbn + '_buk";'
					tx.executeSql 'ALTER TABLE "' + tbn + '" RENAME TO "' + tbn + '_buk";'
		)


restoreDB = ->
	db.transaction (tx) ->
		tx.executeSql("SELECT name FROM sqlite_master WHERE type='table';", [], (tx, result) ->
			for i in [0...result.rows.length]
				tbn = result.rows.item(i).name
				if tbn.slice(-4) == "_buk"
					tx.executeSql 'DROP TABLE IF EXISTS "' + tbn[0...-4] + '";'
					tx.executeSql 'ALTER TABLE "' + tbn + '" RENAME TO "' + tbn[0...-4] + '";'
		)


clearDB = ->
	db.transaction (tx) ->
		tx.executeSql "SELECT name FROM sqlite_master WHERE type='table' AND name !='__WebKitDatabaseInfoTable__';", [], ((tx, result) ->
			for i in [0...result.rows.length]
				tbn = result.rows.item(i).name
				tx.executeSql('DROP TABLE IF EXISTS "' + tbn + '";')
		)

window?.remoteServerRequest = remoteServerRequest
#Temporary fix to allow backup/restore db etc to work for the time being client-side
window?.db = db
window?.importDB = importDB
window?.exportDB = exportDB
window?.backupDB = backupDB
window?.restoreDB = restoreDB
window?.clearDB = clearDB

# fs = require('fs')
# lazy = require("lazy");
# imported = 0
# new lazy(fs.createReadStream(process.argv[2])).lines.forEach((query) ->
	# query = query.toString().trim();
	# if query.length > 0
		# _db.run query, (error) ->
			# if error
				# console.log error, imported++
			# else
				# console.log "Import Success", imported++
# )

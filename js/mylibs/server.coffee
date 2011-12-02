op =
	eq: "="
	ne: "!="
	lk: "~"

db = null

if process?
	express = require('express')
	app = express.createServer()
	app.configure(->
		app.use(express.bodyParser())
		app.use(express.static(process.cwd()))
	)
	requirejs = require('requirejs')
	requirejs.config(
		nodeRequire: require
		baseUrl: 'js'
	)
else
	requirejs = window.requirejs
	app = do() ->
		handlers =
			POST: []
			PUT: []
			DELETE: []
			GET: []
		return {
			post: (match) ->
				handlers.POST.push(
					match: match
					middleware: Array.prototype.slice.call(arguments,1)
				)
			get: (match) ->
				handlers.GET.push(
					match: match
					middleware: Array.prototype.slice.call(arguments,1)
				)
			put: (match) ->
				handlers.PUT.push(
					match: match
					middleware: Array.prototype.slice.call(arguments,1)
				)
			del: (match) ->
				handlers.DELETE.push(
					match: match
					middleware: Array.prototype.slice.call(arguments,1)
				)
			all: (match) ->
				this.post.apply(this, arguments)
				this.get.apply(this, arguments)
				this.put.apply(this, arguments)
				this.del.apply(this, arguments)
			process: (method, uri, headers, body, successCallback, failureCallback) ->
				if uri[-1..] == '/'
					uri = uri[0...uri.length - 1]
				uri = uri.toLowerCase()
				console.log(uri)
				if !handlers[method]
					failureCallback(404)
				req =
					body: body
					headers: headers
					uri: uri
				res =
					json: (obj, headers = 200, statusCode) ->
						if typeof headers == 'number' and !statusCode?
							[statusCode, headers] = [headers, {}]
						if statusCode == 404
							failureCallback(statusCode, obj)
						else
							successCallback(statusCode, obj)
					send: (statusCode) ->
						if statusCode == 404
							failureCallback(statusCode)
						else
							successCallback(statusCode)
				next = (route) ->
					j++
					if route == 'route' or j >= methodHandlers[i].middleware.length
						checkMethodHandlers()
					else
						methodHandlers[i].middleware[j](req, res, next)
				
				methodHandlers = handlers[method]
				i = -1
				j = -1
				checkMethodHandlers = () ->
					i++
					if i < methodHandlers.length
						if uri[0...methodHandlers[i].match.length] == methodHandlers[i].match
							j = -1
							next()
						else
							checkMethodHandlers()
					else
						res.send(404)
				checkMethodHandlers()
		}


requirejs(["libs/inflection",
		"../ometa-js/lib",
		"../ometa-js/ometa-base"])
requirejs([
	"mylibs/ometa-code/SBVRModels",
	"mylibs/ometa-code/SBVRParser",
	"mylibs/ometa-code/SBVR_PreProc",
	"mylibs/ometa-code/SBVR2SQL",
	"mylibs/ometa-code/ServerURIParser"]
)

serverModelCache = () ->
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
		tx.executeSql 'CREATE TABLE '+#Postgres does not support: IF NOT EXISTS
						'"_server_model_cache" (' +
					'"key"	VARCHAR PRIMARY KEY,' +
					'"value"	VARCHAR );'
		tx.executeSql 'SELECT * FROM "_server_model_cache";', [], (tx, result) ->
			for i in [0...result.rows.length]
				row = result.rows.item(i)
				values[row.key] = JSON.parse row.value;

	setValue = (key, value) ->
		values[key] = value
		db.transaction (tx) ->
			value = JSON.stringify(value)
			tx.executeSql('SELECT 1 FROM "_server_model_cache" WHERE "key" = ?;', [key], (tx, result) ->
				if result.rows.length==0
					tx.executeSql 'INSERT INTO "_server_model_cache" VALUES (?, ?);', [key, value], null, null, false
				else
					tx.executeSql 'UPDATE "_server_model_cache" SET value = ? WHERE "key" = ?;', [value, key]
			)

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

requirejs(['mylibs/db'], (dbModule) ->
	if process?
		db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres")
		# db = dbModule.sqlite('/tmp/rulemotion.db')
	else
		db = dbModule.websql('rulemotion')
	serverModelCache = serverModelCache()
)

serverIsOnAir = (req, res, next) ->
	if serverModelCache.isServerOnAir()
		next()
	else
		next('route')
parseURITree = (req, res, next) ->
	if !req.tree?
		try
			req.tree = ServerURIParser.matchAll(req.uri, "uri")
		catch e
			req.tree = false
	if req.tree == false
		next('route')
	else
		next()

app.get('/onair',					   (req, res, next) -> res.json(serverModelCache.isServerOnAir()))
app.get('/model',		serverIsOnAir, (req, res, next) -> res.json(serverModelCache.getLastSE()))
app.get('/lfmodel',		serverIsOnAir, (req, res, next) -> res.json(serverModelCache.getLF()))
app.get('/prepmodel',	serverIsOnAir, (req, res, next) -> res.json(serverModelCache.getPrepLF()))
app.get('/sqlmodel',	serverIsOnAir, (req, res, next) -> res.json(serverModelCache.getSQL()))
app.get('/onair',		serverIsOnAir, (req, res, next) -> res.json(serverModelCache.getSQL()))
app.post('/update',		serverIsOnAir, (req, res, next) -> res.send(404))
app.post('/execute',				   (req, res, next) ->
	se = serverModelCache.getSE()
	try
		lfmod = SBVRParser.matchAll(se, "expr")
	catch e
		console.log('Error parsing model', e)
		res.json('Error parsing model', 404)
		return null
	prepmod = SBVR_PreProc.match(lfmod, "optimizeTree")
	sqlmod = SBVR2SQL.match(prepmod, "trans")
	tree = SBVRParser.matchAll(modelT, "expr")
	tree = SBVR_PreProc.match(tree, "optimizeTree")
	trnmod = SBVR2SQL.match(tree, "trans")
	db.transaction((tx) ->
		tx.begin()
		executeSasync(tx, sqlmod, (tx, result) ->
			#TODO: fix this as soon as the successCallback mess is fixed
			executeTasync(tx, trnmod, (tx, result) ->
				serverModelCache.setModelAreaDisabled(true)
				serverModelCache.setServerOnAir true
				serverModelCache.setLastSE se
				serverModelCache.setLF lfmod
				serverModelCache.setPrepLF prepmod
				serverModelCache.setSQL sqlmod
				serverModelCache.setTrans trnmod
				res.json(result)
			, (errors) ->
				res.json(errors, 404)
			, result
			)
		, (errors) ->
			res.json(errors, 404)
		)
	)
)
app.del('/cleardb', (req, res, next) ->
	db.transaction (tx) ->
		tx.tableList( (tx, result) ->
			for i in [0...result.rows.length]
				tx.dropTable(result.rows.item(i).name)
			res.send(200)
		)
)
app.put('/cleardb', (req, res, next) ->
	queries = req.body.split(";")
	imported = 0
	db.transaction (tx) ->
		for query in queries when query.trim().length > 0
			do (query) ->
				tx.executeSql query, [], ((tx, result) ->
					console.log "Import Success", imported++
				), (tx, error) ->
					console.log query
					console.log error
	res.send(200)
)
app.get('/exportdb', (req, res, next) ->
	if process?
		env = process.env
		env['PGPASSWORD'] = '.'
		require('child_process').exec('pg_dump --clean -U postgres -h localhost -p 5432', env: env, (error, stdout, stderr) ->
			console.log(stdout, stderr)
			res.json(stdout)
		)
	else
		db.transaction (tx) ->
			tx.tableList(
				(tx, result) ->
					totalExports = result.rows.length + 1
					exportsProcessed = 0
					exported = ''
					for i in [0...result.rows.length]
						tbn = result.rows.item(i).name
						exported += 'DROP TABLE IF EXISTS "' + tbn + '";\n'
						exported += result.rows.item(i).sql + ";\n"
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
									exported += insQuery
									exportsProcessed++
									if exportsProcessed == totalExports
										res.json(exported)
								)
					exportsProcessed++
					if exportsProcessed == totalExports
						res.json(exported)
				null
				"name NOT LIKE '%_buk'"
			)
)
app.post('/backupdb', serverIsOnAir, (req, res, next) ->
	db.transaction (tx) ->
		tx.tableList(
			(tx, result) ->
				for i in [0...result.rows.length]
					tbn = result.rows.item(i).name
					tx.dropTable(tbn + '_buk', true)
					tx.executeSql 'ALTER TABLE "' + tbn + '" RENAME TO "' + tbn + '_buk";'
			null
			"name NOT LIKE '%_buk'"
		)
	res.send(200)
)
app.post('/restoredb', serverIsOnAir, (req, res, next) ->
	db.transaction (tx) ->
		tx.tableList(
			(tx, result) ->
				for i in [0...result.rows.length]
					tbn = result.rows.item(i).name
					tx.dropTable(tbn[0...-4], true)
					tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn[0...-4] + '";')
			null
			"name LIKE '%_buk'"
		)
	res.send(200)
)
app.get('/ui', parseURITree, (req, res, next) ->
	if req.tree[1][1] == "textarea" and req.tree[1][3][1][1][3] == "model_area"
		res.json(value: serverModelCache.getSE())
	else if req.tree[1][1] == "textarea-is_disabled" and req.tree[1][4][1][1][3] == "model_area"
		res.json(value: serverModelCache.isModelAreaDisabled())
	else
		res.send(404)
)
app.put('/ui', parseURITree, (req, res, next) ->
	if req.tree[1][1] == "textarea" and req.tree[1][3][1][1][3] == "model_area"
		serverModelCache.setSE( req.body.value )
		res.send(200)
	else if req.tree[1][1] == "textarea-is_disabled" and req.tree[1][4][1][1][3] == "model_area"
		serverModelCache.setModelAreaDisabled( req.body.value )
		res.send(200)
	else
		res.send(404)
)

app.get('/data', serverIsOnAir, parseURITree, (req, res, next) ->
	tree = req.tree
	if tree[1] == undefined
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

		res.json(result)
	else if tree[1][1] == "transaction"
		res.json(
			id: tree[1][3][1][1][3]
			tcURI: "/transaction"
			lcURI: "/data/lock"
			tlcURI: "/data/lock-belongs_to-transaction"
			rcURI: "/data/resource"
			lrcURI: "/data/resource-is_under-lock"
			slcURI: "/data/lock-is_shared"
			xlcURI: "/data/lock-is_exclusive"
			ctURI: "/data/transaction*filt:transaction.id=" + tree[1][3][1][1][3] + "/execute"
		)
	else
		ftree = getFTree(tree)
		sql = ""
		if tree[1][0] == "term"
			sql = "SELECT * FROM " + tree[1][1]
			sql += " WHERE " unless ftree.length == 1
		else if tree[1][0] == "fcTp"
			ft = tree[1][1]
			fl = [ '"' + ft + '".id AS id' ]
			jn = []
			tb = [ '"' + ft + '"' ]

			for row in tree[1][2][1..]
				fl.push '"' + row + '".id AS "' + row + '_id"'
				fl.push '"' + row + '".name AS "' + row + '_name"'
				tb.push '"' + row + '"'
				jn.push '"' + row + '".id = "' + ft + '"."' + row + '_id"'

			sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ")
			sql += " AND " unless ftree.length == 1
		if ftree.length != 1
			filts = []

			for row in ftree[1..]
				if row[0] == "filt"
					for row2 in row[1..]
						obj = ""
						obj = '"' + row2[1] + '".' if row2[1][0]?
						filts.push obj + '"' + row2[2] + '"' + op[row2[0]] + row2[3]
				else if row[0] == "sort"
					#process sort
					null
			sql += filts.join(" AND ")
		if sql != ""
			db.transaction (tx) ->
				tx.executeSql sql + ";", [], (tx, result) ->
					data = instances: result.rows.item(i) for i in [0...result.rows.length]
					res.json(data)
		else
			res.send(404)

)

app.post('/data', serverIsOnAir, parseURITree, (req, res, next) ->
	if req.tree[1] == undefined
		res.send(404)
	else
		tree = req.tree
		#figure out if it's a POST to transaction/execute
		if tree[1][1] == "transaction" and isExecute(tree)
			id = getID tree

			#get all locks of transaction
			db.transaction ((tx) ->
				tx.executeSql 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id" = ?;', [id], (tx, locks) ->
					endLock(tx, locks, 0, id, (tx, result) ->
						res.json(result)
					, (errors) ->
						res.json(errors, 404)
					)
			)
		else
			fields = []
			values = []
			binds = []
			for own i, pair of req.body
				for own field, value of pair
					fields.push field
					values.push value
					binds.push '?'
			db.transaction (tx) ->
				tx.begin()
				sql = 'INSERT INTO "' + tree[1][1] + '" ("' + fields.join('","') + '") VALUES (' + binds.join(",") + ");"
				tx.executeSql(sql, values, (tx, sqlResult) ->
					validateDB(tx, serverModelCache.getSQL(), (tx, result) ->
						res.json(result,
							location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + sqlResult.insertId
							201
						)
					, (errors) ->
						res.json(errors, 404)
					)
				)
)

app.put('/data', serverIsOnAir, parseURITree, (req, res, next) ->
	if req.tree[1] == undefined
		res.send(404)
	else
		tree = req.tree
		id = getID(tree)
		if tree[1][1] == "lock" and hasCR(tree)
			#CR posted to Lock
			db.transaction (tx) ->
				tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]

				sql = 'INSERT INTO "conditional_representation"' +
					'("lock_id","field_name","field_type","field_value")' +
					"VALUES (?, ?, ?, ?)"
				for pair in req.body
					for own key, value of pair
						tx.executeSql(sql, [ id, key, typeof value, value ])
				res.send(200)
		else
			db.transaction ((tx) ->
				tx.executeSql 'SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], (tx, result) ->
					if result.rows.item(0).result in [1, true]
						if id != ""
							setStatements = []
							binds = []
							for pair in req.body
								for own key, value of pair
									setStatements.push('"' + key + '"= ?')
									binds.push(value)
							binds.push(id)
							tx.begin()
							tx.executeSql('UPDATE "' + tree[1][1] + '" SET ' + setStatements.join(", ") + " WHERE id = ?;", binds, (tx) ->
								validateDB(tx, serverModelCache.getSQL(), (tx, result) ->
									tx.end()
									res.json(result)
								, (errors) ->
									res.json(errors, 404)
								)
							)
					else
						res.json([ "The resource is locked and cannot be edited" ], 404)
			)
)

app.del('/data', serverIsOnAir, parseURITree, (req, res, next) ->
	tree = req.tree
	if tree[1] == undefined
		res.send(404)
	else
		id = getID(tree)
		if id != 0
			if tree[1][1] == "lock" and hasCR(tree)
				#CR posted to Lock
				#insert delete entry
				db.transaction (tx) ->
					tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]
					tx.executeSql 'INSERT INTO "conditional_representation" ("lock_id","field_name","field_type","field_value")' +
								"VALUES (?,'__DELETE','','')", [id]
					res.send(200)
			else
				db.transaction ((tx) ->
					tx.executeSql 'SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], (tx, result) ->
						if result.rows.item(0).result in [1, true]
							tx.begin()
							tx.executeSql 'DELETE FROM "' + tree[1][1] + '" WHERE id = ?;', [id], (tx, result) ->
								validateDB(tx, serverModelCache.getSQL(), (tx, result) ->
									tx.end()
									res.json(result)
								, (errors) ->
									res.json(errors, 404)
								)
						else
							res.json([ "The resource is locked and cannot be deleted" ], 404)
				)
)

app.del('/', serverIsOnAir, (req, res, next) ->
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

	res.send(200)
)



endLock = (tx, locks, i, trans_id, successCallback, failureCallback) ->
	continueEndingLock = (tx, result) ->
		if i < locks.rows.length - 1
			endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback)
		else
			tx.executeSql 'DELETE FROM "transaction" WHERE "id" = ?;', [trans_id]

			validateDB(tx, serverModelCache.getSQL(), successCallback, failureCallback)


	#get conditional representations (if exist)
	lock_id = locks.rows.item(i).lock_id
	tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id], (tx, crs) ->
		#find which resource is under this lock
		tx.executeSql('SELECT * FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [lock_id], (tx, locked) ->
			if crs.rows.item(0).field_name == "__DELETE"
				#delete said resource
				tx.executeSql 'DELETE FROM "' + locked.rows.item(0).resource_type + '" WHERE "id" = ?;', [locked.rows.item(0).resource_id], continueEndingLock
			else
				#commit conditional_representation
				sql = 'UPDATE "' + locked.rows.item(0).resource_type + '" SET '

				for j in [0...crs.rows.length]
					item = crs.rows.item(j);
					sql += '"' + item.field_name + '"='
					if item.field_type == "string"
						sql += '"' + item.field_value + '"'
					else
						sql += item.field_value
					sql += ", " if j < crs.rows.length - 1
				sql += ' WHERE "id"=' + locked.rows.item(0).resource_id + ';'
				tx.executeSql sql, [], continueEndingLock
			tx.executeSql 'DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id]
			tx.executeSql 'DELETE FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [lock_id]
		)
	)

	tx.executeSql 'DELETE FROM "lock-is_shared" WHERE "lock_id" = ?;', [lock_id]
	tx.executeSql 'DELETE FROM "lock-is_exclusive" WHERE "lock_id" = ?;', [lock_id]
	tx.executeSql 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id" = ?;', [lock_id]
	tx.executeSql 'DELETE FROM "lock" WHERE "id" = ?;', [lock_id]

# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
validateDB = (tx, sqlmod, successCallback, failureCallback) ->
	errors = []
	totalQueries = 0
	totalExecuted = 0

	for row in sqlmod when row[0] == "rule"
		totalQueries++
		tx.executeSql row[4], [], do(row) ->
			(tx, result) ->
				totalExecuted++
				if result.rows.item(0).result in [false, 0]
					errors.push row[2]

				if totalQueries == totalExecuted
					if errors.length > 0
						tx.rollback()
						failureCallback(errors)
					else
						tx.end()
						successCallback tx, result
	if totalQueries == 0
		successCallback tx, ""


# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
executeSasync = (tx, sqlmod, successCallback, failureCallback, result) ->
	#Create tables related to terms and fact types
	for row in sqlmod when row[0] in ["fcTp", "term"]
		tx.executeSql(row[4])

	#Validate the [empty] model according to the rules.
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	validateDB(tx, sqlmod, successCallback, failureCallback)


# successCallback = (tx, sqlmod, failureCallback, result)
# failureCallback = (errors)
executeTasync = (tx, trnmod, successCallback, failureCallback, result) ->
	#Execute transaction model.
	executeSasync(tx, trnmod, (tx, result) ->
		#Hack: Add certain attributes to the transaction model tables.
		#This should eventually be done with SBVR, when we add attributes.
		tx.executeSql 'ALTER TABLE "resource-is_under-lock" ADD COLUMN resource_type TEXT'
		tx.executeSql 'ALTER TABLE "resource-is_under-lock" DROP CONSTRAINT "resource-is_under-lock_resource_id_fkey";'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_name TEXT'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_value TEXT'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN field_type TEXT'
		tx.executeSql 'ALTER TABLE "conditional_representation" ADD COLUMN lock_id INTEGER'
		successCallback tx, result
	, (errors) ->
		serverModelCache.setModelAreaDisabled false
		failureCallback(errors)
	, result
	)


updateRules = (sqlmod) ->
	#Create tables related to terms and fact types
	#if not exists clause makes sure table is not double-created,
	#tho this should be dealt with more elegantly.
	for row in sqlmod when row[0] in ["fcTp", "term"]
		tx.executeSql row[4]

	#Validate the [empty] model according to the rules.
	#This may eventually lead to entering obligatory data.
	#For the moment it blocks such models from execution.
	for row in sqlmod when row[0] == "rule"
		query = row[4]
		l[++m] = row[2]
		tx.executeSql query, [], (tx, result) ->
			if result.rows.item(0).result in [0, false]
				alert "Error: " + l[++k]


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
	for f in getFTree(tree) when f[0] == "cr"
		return true
	return false

isExecute = (tree) ->
	for f in getFTree(tree) when f[0] == "execute"
		return true
	return false

if process?
	app.listen(process.env.PORT or 1337, () ->
		console.log('Server started')
	)


window?.remoteServerRequest = app.process
	

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

define((requirejs, exports, module) ->

	# POST /publish
	# Save the body (SBVR model) into the database under filename
	# GET /publish/:key
	# Return the SBVR model from the database matching filename

	# To build:
	# rulemotion-canvas/build
	# jake editor:build modules=editor

	# To run:
	# rulemotion-canvas/out/publish
	# node js/mylibs/server.js
	# http://localhost:1337/

	db = null

	# number to base 62
	toBase = (decimal , base) ->
		symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
		chars = ""
		if base > symbols.length or base <= 1 
			return false
		while decimal >= 1
				chars = symbols[(decimal - (base * Math.floor(decimal / base)))] + chars
				decimal = Math.floor(decimal / base)	
		return  chars

	# base 62 to number
	decodeBase = (url, base) -> 
		symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
		sum = 0
		for alphaChar in url.split("")
			alphaNum = alphaChar.charCodeAt(0)
			if (48 <= alphaNum && alphaNum <= 57) # 0-9 48-57
				alphaNum -= 48
			else if (65 <= alphaNum && alphaNum <= 90) # A-Z 36-61
				alphaNum -= 29
			else if (97 <= alphaNum && alphaNum <= 122) # a-z 10-35
				alphaNum -= 87
			else 
				return false
			sum *= base	
			sum += alphaNum
		return sum

	exports.setup = (app, requirejs, databaseOptions) ->
		requirejs(['database-layer/db'], (dbModule) ->
			db = dbModule.connect(databaseOptions)
			db.transaction( (tx) ->
				tx.tableList(
					(tx, result) ->
						if result.rows.length == 0
							tx.executeSql	'CREATE TABLE '+ # Postgres does not support: IF NOT EXISTS
											'"_sbvr_editor_cache" (' +
											'"id" INTEGER PRIMARY KEY AUTOINCREMENT,' +
											# '"key" VARCHAR PRIMARY KEY,' +
											'"value" TEXT );' 
					null
					"name = '_sbvr_editor_cache'"
				)
			)
		)
		
		app.post('/publish', (req, res, next) ->
			db.transaction (tx) ->
				try
					lfmod = SBVRParser.matchAll(req.body, "Process")
				catch e
					console.log 'Error parsing model', e
					res.json('Error parsing model')
					return null
				value = JSON.stringify(req.body)
				tx.executeSql 'INSERT INTO "_sbvr_editor_cache" ("value") VALUES (?);', [value], 
					(tx, result) ->
						res.json(toBase(result.insertId,62))
					(tx, error) ->
						res.json(error)
				#						tx.executeSql('SELECT 1 FROM "_sbvr_editor_cache" WHERE key = ?;', [key], (tx, result) ->
				#							if result.rows.length==0
				#								tx.executeSql 'INSERT INTO "_sbvr_editor_cache" VALUES (?, ?);', [key, value], null, null, false
				#							else
				#								tx.executeSql 'UPDATE "_sbvr_editor_cache" SET value = ? WHERE key = ?;', [value, key]
				#						)
		)
		app.get('/publish/:key', (req, res, next) ->
			key = decodeBase(req.params.key,62)
			if key == false
				res.send(404)
			else
				console.log('key: ',key)
				db.transaction (tx) ->
					tx.executeSql 'SELECT * FROM "_sbvr_editor_cache" WHERE id = ?;', [key],
						(tx, result) ->
							if result.rows.length == 0
								res.json("Error")
							else
								res.send(result.rows.item(0).value)
						(tx, error) ->
							res.json(error)
		)
	return exports
)
# POST /node/filename
# Save the body (SBVR model) into the database under filename
# GET /node/filename
# Return the SBVR model from the database matching filename

#r .


# To build:
# rulemotion-canvas/build
# jake editor:build modules=editor

# To run:
# rulemotion-canvas/out/publish
# node server.js
# http://localhost:1337/

db = null
if process?
	requirejs = require('requirejs')
	requirejs.config(
		nodeRequire: require
		baseUrl: 'js'
	)
else
	requirejs = window.requirejs
requirejs([
	"libs/inflection",
	"../ometa-js/lib",
	"../ometa-js/ometa-base"])
requirejs([
	"mylibs/ometa-code/SBVRModels",
	"mylibs/ometa-code/SBVRParser",
	"mylibs/ometa-code/SBVR_PreProc",
	"mylibs/ometa-code/SBVR2SQL",
	"mylibs/ometa-code/ServerURIParser"]
)		
requirejs(['mylibs/db'], (dbModule) ->
	if process?
		db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres")
	else
		db = dbModule.websql('rulemotion')
	db.transaction( (tx) ->
		tx.tableList(
			(tx, result) ->
				if result.rows.length == 0
					tx.executeSql	'CREATE TABLE '+#Postgres does not support: IF NOT EXISTS
									'"_sbvr_editor_cache" (' +
									'"id" INTEGER PRIMARY KEY AUTOINCREMENT,' +
									#'"key" VARCHAR PRIMARY KEY,' +
									'"value" VARCHAR );' 
			null
			"name = '_sbvr_editor_cache'"
		)
	)
)

#number to base 62
toBase = (decimal , base) ->
	symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
	chars = ""
	if base > symbols.length or base <= 1 
		return false
	while decimal >= 1
			chars = symbols[(decimal - (base * Math.floor(decimal / base)))] + chars
			decimal = Math.floor(decimal / base)	
	return  chars

#base 62 to number
decodeBase = (url, base) -> 
	symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
	sum = 0
	for alphaChar in url.split("")
		alphaNum = alphaChar.charCodeAt(0)
		if (48 <= alphaNum && alphaNum <= 57) #0-9 48-57
			alphaNum -= 48
		else if (65 <= alphaNum && alphaNum <= 90) #A-Z 36-61
			alphaNum -= 29
		else if (97 <= alphaNum && alphaNum <= 122) #a-z 10-35
			alphaNum -= 87
		else 
			return false
		sum *= base	
		sum += alphaNum
	return sum

staticServer = new(require('node-static').Server)('./');
http = require('http')
http.createServer((request, response) ->
		body = ''
		request.on('data', (chunk) ->
			body += chunk
		)
		request.on('end', () ->
			console.log('End', request.method, request.url)
			nodePath = '/node'
			if nodePath == request.url[0...nodePath.length] #/node/a
				#key = "file"
				response.writeHead(200, "content-type": "text/plain")
				if request.method == "POST"
					db.transaction (tx) ->
						try
							lfmod = SBVRParser.matchAll(body, "expr")
						catch e
							console.log 'Error parsing model', e
							response.end(JSON.stringify('Error parsing model'))
							return null
						value = JSON.stringify(body)
						tx.executeSql 'INSERT INTO "_sbvr_editor_cache" ("value") VALUES (?);', [value], 
							(tx, result) ->
								response.end(JSON.stringify(toBase(result.insertId,62)))
							(tx, error) ->
								response.end(JSON.stringify(error))
	#						tx.executeSql('SELECT 1 FROM "_sbvr_editor_cache" WHERE key = ?;', [key], (tx, result) ->
	#							if result.rows.length==0
	#								tx.executeSql 'INSERT INTO "_sbvr_editor_cache" VALUES (?, ?);', [key, value], null, null, false
	#							else
	#								tx.executeSql 'UPDATE "_sbvr_editor_cache" SET value = ? WHERE key = ?;', [value, key]
	#						)
				else if request.method == "GET"
					key = decodeBase(request.url[nodePath.length+1..],62)
					if key != false
						console.log('key: ',key)
						db.transaction (tx) ->
							tx.executeSql 'SELECT * FROM "_sbvr_editor_cache" WHERE id = ?;', [key],
								(tx, result) ->
									if result.rows.length == 0
										response.end(JSON.stringify("Error"))
									else
										response.end(result.rows.item(0).value)
								(tx, error) ->
									response.end(JSON.stringify(error))
				else 
					response.end()
					
			else
				console.log('Static')
				staticServer.serve(request, response)
		)
).listen(process.env.PORT or 1337, () ->
	console.log('Server started')
)

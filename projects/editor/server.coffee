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
requirejs(["../ometa-js/lib",
	"../ometa-js/ometa-base"])
requirejs(['mylibs/db'], (dbModule) ->
	if process?
		db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres")
	else
		db = dbModule.websql('rulemotion')
	db.transaction (tx) ->
		tx.tableList (
			(tx, result) ->
				if result.rows.length == 0
					tx.executeSql	'CREATE TABLE '+#Postgres does not support: IF NOT EXISTS
									'"_sbvr_editor_cache" (' +	
									'"key"	VARCHAR PRIMARY KEY,' +	
									'"value"	VARCHAR );' 
			null
			"name = '_sbvr_editor_cache'")
)


staticServer = new(require('node-static').Server)('./');
http = require('http')
http.createServer((request, response) ->
		body = ''
		request.on('data', (chunk) ->
			body += chunk
		)
		request.on('end', () ->
			console.log('End', request.method, request.url)
			nodePath = '/node/file'
			if nodePath == request.url[0...nodePath.length]
				key = "file"
				response.writeHead(200, "")
				if request.method == "POST"
					db.transaction (tx) ->
						value = JSON.stringify(body)
						tx.executeSql('SELECT 1 FROM "_sbvr_editor_cache" WHERE key = ?;', [key], (tx, result) ->
							if result.rows.length==0
								tx.executeSql 'INSERT INTO "_sbvr_editor_cache" VALUES (?, ?);', [key, value], null, null, false
							else
								tx.executeSql 'UPDATE "_sbvr_editor_cache" SET value = ? WHERE key = ?;', [value, key]
						)
					response.end(JSON.stringify(""))
				else if request.method == "GET"
					db.transaction (tx) ->
						tx.executeSql 'SELECT * FROM "_sbvr_editor_cache" WHERE key = ?;', [key],
							(tx, result) ->
								if result.rows.length == 0
									response.end(JSON.stringify("Error"))
								else
									response.end(result.rows.item(0).value)
							(tx, error) ->
								response.end(JSON.stringify(error))
			else
				console.log('Static')
				staticServer.serve(request, response)
		)
).listen(process.env.PORT or 1337, () ->
	console.log('Server started')
)
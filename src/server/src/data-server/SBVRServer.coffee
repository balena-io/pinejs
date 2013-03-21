define([
	'async'
	'lodash'
	'has'
], (async, _, has) ->
	exports = {}
	db = null

	uiModel = '''
			Vocabulary: ui

			Term:       text
				Concept type: Text (Type)
			Term:       name
				Concept type: Short Text (Type)
			Term:       textarea
				--Database id Field: name
				Reference Scheme: text
			Fact type:  textarea is disabled
			Fact type:  textarea has name
				Necessity: Each textarea has exactly 1 name
				Necessity: Each name is of exactly 1 textarea
			Fact type:  textarea has text
				Necessity: Each textarea has exactly 1 text'''

	isServerOnAir = do() ->
		onAir = null
		pendingCallbacks = []
		return (funcOrVal) ->
			if funcOrVal == true or funcOrVal == false
				# If we are setting new value then set the onAir var
				onAir = funcOrVal
				# And monkey patch to just set value or call callback.
				isServerOnAir = (funcOrVal) ->
					if funcOrVal == true or funcOrVal == false
						onAir = funcOrVal
					else
						funcOrVal(onAir)
				# And call all the callbacks that are pending.
				for callback in pendingCallbacks
					callback(onAir)
				pendingCallbacks = null
			else
				# If we have no value set yet then just add the func to the callback queue
				pendingCallbacks.push(funcOrVal)

	# Middleware
	serverIsOnAir = (req, res, next) ->
		isServerOnAir((onAir) ->
			if onAir
				next()
			else
				next('route')
		)
	
	uiModelLoaded = do ->
		_nexts = []
		runNext = (next, loaded) ->
			if loaded == true
				runNext = (next) -> next?()
				for next in _nexts
					setTimeout(next, 0)
			else
				_nexts.push(next)
		(req, res, next) ->
			runNext(next, req)

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, db) ->
		setupModels = (tx) ->
			sbvrUtils.executeModel(tx, 'ui', uiModel, (err) ->
				if err
					console.error('Failed to execute ui model.', err)
				else
					console.log('Sucessfully executed ui model.')
					uiModelLoaded(true)
			)
			sbvrUtils.runURI('GET', "/dev/model?$filter=model_type eq 'se' and vocabulary eq 'data'", null, tx, (err, result) ->
				if !err and result.d.length > 0
					instance = result.d[0]
					sbvrUtils.executeModel(tx, instance.vocabulary, instance['model value'], (err) ->
						if err
							isServerOnAir(false)
						else
							isServerOnAir(true)
					)
				else
					isServerOnAir(false)
			)

		db.transaction(setupModels)

		app.get('/onAir', (req, res, next) -> 
			isServerOnAir((onAir) ->
				res.json(onAir)
			)
		)
		app.post('/update', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			res.send(404)
		)
		app.post('/execute', sbvrUtils.checkPermissionsMiddleware('all'), uiModelLoaded, (req, res, next) ->
			sbvrUtils.runURI('GET', "/ui/textarea?$filter=name eq 'model_area'", null, null, (err, result) ->
				if !err and result.d.length > 0
					seModel = result.d[0].text
					db.transaction((tx) ->
						tx.begin()
						sbvrUtils.executeModel(tx, 'data', seModel, (err) ->
							if err
								res.json(err, 404)
								return
							sbvrUtils.runURI('PUT', '/ui/textarea', {
								'is disabled': true
								name: 'model_area'
							}, tx)
							isServerOnAir(true)
							res.send(200)
						)
					)
				else
					res.send(404)
			)
		)
		app.post('/validate', sbvrUtils.checkPermissionsMiddleware('get'), uiModelLoaded, (req, res, next) ->
			console.log(req.body)
			sbvrUtils.runRule('data', req.body.rule, (err, results) ->
				if err?
					res.send(404)
				else
					res.json(results)
			)
		)
		app.del('/cleardb', sbvrUtils.checkPermissionsMiddleware('delete'), (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList( (tx, result) ->
					async.forEach(result.rows,
						(table, callback) ->
							tx.dropTable(table.name, null,
								-> callback()
								-> callback(arguments)
							)
						(err) ->
							if err?
								res.send(404)
								return
							sbvrUtils.executeStandardModels(tx, (err) ->
								if err
									res.send(503)
									return
								setupModels(tx)
								res.send(200)
							)
					)
				)
		)
		app.put('/importdb', sbvrUtils.checkPermissionsMiddleware('set'), (req, res, next) ->
			queries = req.body.split(";")
			db.transaction((tx) ->
				async.forEach(queries,
					(query, callback) ->
						query = query.trim()
						if query.length > 0
							tx.executeSql(query, [],
								-> callback()
								(tx, err) -> callback([query, err])
							)
					(err) ->
						if err?
							console.error(err)
							res.send(404)
						else
							res.send(200)
				)
			)
		)
		app.get('/exportdb', sbvrUtils.checkPermissionsMiddleware('get'), (req, res, next) ->
			if has 'ENV_NODEJS'
				# TODO: This is postgres rather than node specific, so the check should be updated to reflect that.
				env = process.env
				env['PGPASSWORD'] = '.'
				req = require
				req('child_process').exec('pg_dump --clean -U postgres -h localhost -p 5432', env: env, (error, stdout, stderr) ->
					console.log(stdout, stderr)
					res.json(stdout)
				)
			else
				db.transaction((tx) ->
					tx.tableList(
						(tx, result) ->
							exported = ''
							async.forEach(result.rows,
								(currRow, callback) ->
									tableName = currRow.name
									exported += 'DROP TABLE IF EXISTS "' + tableName + '";\n'
									exported += currRow.sql + ";\n"
									tx.executeSql('SELECT * FROM "' + tableName + '";', [], 
										(tx, result) ->
											insQuery = ''
											result.rows.forEach((currRow) ->
												notFirst = false
												insQuery += 'INSERT INTO "' + tableName + '" ('
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
											)
											exported += insQuery
											callback()
										(tx, err) -> callback(err)
									)
								(err) ->
									if err?
										console.error(err)
										res.send(404)
									else
										res.json(exported)
							)
						null
						"name NOT LIKE '%_buk'"
					)
				)
		)
		app.post('/backupdb', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			db.transaction((tx) ->
				tx.tableList(
					(tx, result) ->
						async.forEach(result.rows,
							(currRow, callback) ->
								tableName = currRow.name
								async.parallel([
										(callback) ->
											tx.dropTable(tableName + '_buk', true,
												-> callback()
												(tx, err) -> callback(err)
											)
										(callback) ->
											tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName + '_buk";', [],
												-> callback()
												(tx, err) -> callback(err)
											)
									], callback
								)
							(err) ->
								if err?
									console.error(err)
									res.send(404)
								else
									res.send(200)
						)
					(tx, err) ->
						console.error(err)
						res.send(404)
					"name NOT LIKE '%_buk'"
				)
			)
		)
		app.post('/restoredb', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			db.transaction((tx) ->
				tx.tableList(
					(tx, result) ->
						async.forEach(result.rows,
							(currRow, callback) ->
								tableName = currRow.name
								async.parallel([
										(callback) ->
											tx.dropTable(tableName[0...-4], true,
												-> callback()
												(tx, err) -> callback(err)
											)
										(callback) ->
											tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName[0...-4] + '";', [],
												-> callback()
												(tx, err) -> callback(err)
											)
									], callback
								)
							(err) ->
								if err?
									console.error(err)
									res.send(404)
								else
									res.send(200)
						)
					(tx, err) ->
						console.error(err)
						res.send(404)
					"name LIKE '%_buk'"
				)
			)
		)
		
		app.get('/ui/*', uiModelLoaded, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
		)
		app.get('/data/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
		)
		app.get('/Auth/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runGet(req, res)
		)

		app.post('/data/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPost(req, res)
		)
		app.post('/Auth/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPost(req, res)
		)

		app.put('/ui/*', uiModelLoaded, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPut(req, res)
		)
		app.put('/data/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPut(req, res)
		)
		app.put('/Auth/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runPut(req, res)
		)

		app.del('/data/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runDelete(req, res)
		)

		app.del('/Auth/*', serverIsOnAir, sbvrUtils.parseURITree, (req, res, next) ->
			sbvrUtils.runDelete(req, res)
		)

		app.del('/', uiModelLoaded, serverIsOnAir, (req, res, next) ->
			# TODO: This should be done a better way?
			sbvrUtils.runURI('DELETE', "/ui/textarea__is_disabled?$filter=textarea/name eq 'model_area'")
			sbvrUtils.runURI('PUT', '/ui/textarea',
				text: ''
				name: 'model_area'
			)
			sbvrUtils.deleteModel('data')
			isServerOnAir(false)

			res.send(200)
		)
	return exports
)

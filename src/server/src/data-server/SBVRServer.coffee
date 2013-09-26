define [
	'lodash'
	'has'
	'q'
], (_, has, Q) ->
	exports = {}
	db = null
	Q.longStackSupport = true

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
			uiModelPromise =
				Q.nfcall(sbvrUtils.executeModel, tx, 'ui', uiModel)
				.then(->
					console.info('Sucessfully executed ui model.')
					uiModelLoaded(true)
				).catch((err) ->
					console.error('Failed to execute ui model.', err)
					throw err
				)
			dataModelPromise =
				sbvrUtils.runURI('GET', "/dev/model?$filter=model_type eq 'se' and vocabulary eq 'data'", null, tx)
				.then((result) ->
					if result.d.length is 0
						throw new Error('No SE data model found')
					instance = result.d[0]
					Q.nfcall(sbvrUtils.executeModel, tx, instance.vocabulary, instance.model_value)
				)
				.then(->
					isServerOnAir(true)
				).catch((err) ->
					isServerOnAir(false)
				)
			Q.all([uiModelPromise, dataModelPromise])
			.then(->
				tx.end()
			).catch((err) ->
				console.error(err)
				tx.rollback()
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
					db.transaction (tx) ->
						sbvrUtils.executeModel tx, 'data', seModel, (err) ->
							if err
								tx.rollback()
								res.json(err, 404)
								return
							sbvrUtils.runURI 'PATCH', "/ui/textarea?$filter=name eq 'model_area'", {
								is_disabled: true
								name: 'model_area'
							}, tx, (err) ->
								isServerOnAir(true)
								tx.end()
								res.send(200)
				else
					res.send(404)
			)
		)
		app.post '/validate', sbvrUtils.checkPermissionsMiddleware('get'), uiModelLoaded, (req, res, next) ->
			sbvrUtils.runRule 'data', req.body.rule, (err, results) ->
				if err
					res.send(404)
				else
					res.json(results)
		app.del '/cleardb', sbvrUtils.checkPermissionsMiddleware('delete'), (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList()
				.then((result) ->
					Q.all result.rows.map (table) ->
						tx.dropTable(table.name)
				).then(->
					Q.nfcall(sbvrUtils.executeStandardModels, tx)
				).then(->
					setupModels(tx)
					res.send(200)
				).catch((err) ->
					console.error('Error clearing db', err)
					tx.rollback()
					res.send(503)
				)
		app.put '/importdb', sbvrUtils.checkPermissionsMiddleware('set'), (req, res, next) ->
			queries = req.body.split(";")
			db.transaction (tx) ->
				Q.all(_.map queries, (query) ->
					query = query.trim()
					if query.length > 0
						tx.executeSql(query).catch((err) ->
							throw [query, err]
						)
				).then(->
					tx.end()
					res.send(200)
				).catch((err) ->
					console.error(err)
					tx.rollback()
					res.send(404)
				)
		app.get '/exportdb', sbvrUtils.checkPermissionsMiddleware('get'), (req, res, next) ->
			if has 'ENV_NODEJS'
				# TODO: This is postgres rather than node specific, so the check should be updated to reflect that.
				env = process.env
				env['PGPASSWORD'] = '.'
				req = require
				req('child_process').exec 'pg_dump --clean -U postgres -h localhost -p 5432', env: env, (error, stdout, stderr) ->
					res.json(stdout)
			else
				db.transaction (tx) ->
					tx.tableList("name NOT LIKE '%_buk'")
					.then((result) ->
						exported = ''
						Q.all(result.rows.map (table) ->
							tableName = table.name
							exported += 'DROP TABLE IF EXISTS "' + tableName + '";\n'
							exported += table.sql + ";\n"
							tx.executeSql('SELECT * FROM "' + tableName + '";')
							.then((result) ->
								insQuery = ''
								result.rows.forEach (currRow) ->
									notFirst = false
									insQuery += 'INSERT INTO "' + tableName + '" ('
									valQuery = ''
									for own propName of currRow
										if notFirst
											insQuery += ','
											valQuery += ','
										else
											notFirst = true
										insQuery += '"' + propName + '"'
										valQuery += "'" + currRow[propName] + "'"
									insQuery += ") values (" + valQuery + ");\n"
								exported += insQuery
							)
						).then(->
							tx.end()
							res.json(exported)
						)
					).catch((err) ->
						console.error(err)
						tx.rollback()
						res.send(503)
					)
		app.post '/backupdb', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList("name NOT LIKE '%_buk'").then((result) ->
					Q.all result.rows.map (currRow) ->
						tableName = currRow.name
						Q.all([
							tx.dropTable(tableName + '_buk', true)
							tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName + '_buk";')
						])
				).then(->
					res.send(200)
				).catch((err) ->
					console.error(err)
					res.send(404)
				)
		app.post '/restoredb', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList("name LIKE '%_buk'").then((result) ->
					Q.all result.rows.map (currRow) ->
						tableName = currRow.name
						Q.all([
							tx.dropTable(tableName[0...-4], true)
							tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName[0...-4] + '";')
						])
				).then(->
					res.send(200)
				).catch((err) ->
					console.error(err)
					res.send(404)
				)

		app.get('/ui/*', uiModelLoaded, sbvrUtils.runGet)
		app.get('/data/*', serverIsOnAir, sbvrUtils.runGet)
		app.get('/Auth/*', serverIsOnAir, sbvrUtils.runGet)

		app.post('/data/*', serverIsOnAir, sbvrUtils.runPost)
		app.post('/Auth/*', serverIsOnAir, sbvrUtils.runPost)

		app.put('/ui/*', uiModelLoaded, sbvrUtils.runPut)
		app.put('/data/*', serverIsOnAir, sbvrUtils.runPut)
		app.put('/Auth/*', serverIsOnAir, sbvrUtils.runPut)

		app.patch('/ui/*', uiModelLoaded, sbvrUtils.runPut)
		app.patch('/data/*', serverIsOnAir, sbvrUtils.runPut)
		app.patch('/Auth/*', serverIsOnAir, sbvrUtils.runPut)

		app.merge('/ui/*', uiModelLoaded, sbvrUtils.runPut)
		app.merge('/data/*', serverIsOnAir, sbvrUtils.runPut)
		app.merge('/Auth/*', serverIsOnAir, sbvrUtils.runPut)

		app.del('/data/*', serverIsOnAir, sbvrUtils.runDelete)
		app.del('/Auth/*', serverIsOnAir, sbvrUtils.runDelete)

		app.del('/', uiModelLoaded, serverIsOnAir, (req, res, next) ->
			# TODO: This should be done a better way?
			sbvrUtils.runURI('PATCH', "/ui/textarea?$filter=name eq 'model_area'",
				text: ''
				name: 'model_area'
				is_disabled: false
			)
			sbvrUtils.deleteModel('data')
			isServerOnAir(false)

			res.send(200)
		)
	return exports

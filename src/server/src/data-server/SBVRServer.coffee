define [
	'lodash'
	'has'
	'bluebird'
], (_, has, Promise) ->
	exports = {}

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

	# Middleware
	isServerOnAir = do ->
		deferred = Promise.pending()
		promise = deferred.promise
		(value) ->
			if value?
				if promise.isPending()
					deferred.fulfill(value)
					deferred = null
				else
					promise = Promise.fulfilled(value)
			return promise

	serverIsOnAir = (req, res, next) ->
		isServerOnAir().then((onAir) ->
			if onAir
				next()
			else
				next('route')
		)
	
	isUiModelLoaded = Promise.pending()
	uiModelLoaded = (req, res, next) ->
		isUiModelLoaded.promise.then(->
			next()
		)

	# Setup function
	exports.setup = (app, requirejs, sbvrUtils, db) ->
		setupModels = (tx) ->
			Promise.all([
				sbvrUtils.executeModel(tx, 'ui', uiModel)
				.then(->
					console.info('Sucessfully executed ui model.')
					isUiModelLoaded.fulfill()
				).catch((err) ->
					console.error('Failed to execute ui model.', err, err.stack)
					throw err
				)
			,
				sbvrUtils.runURI('GET', "/dev/model?$filter=model_type eq 'se' and vocabulary eq 'data'", null, tx)
				.then((result) ->
					if result.d.length is 0
						throw new Error('No SE data model found')
					instance = result.d[0]
					sbvrUtils.executeModel(tx, instance.vocabulary, instance.model_value)
				)
				.then(->
					isServerOnAir(true)
				).catch((err) ->
					isServerOnAir(false)
				)
			])

		app.get '/onAir', (req, res, next) -> 
			isServerOnAir()
			.then((onAir) ->
				res.json(onAir)
			)

		app.post '/update', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			res.send(404)

		app.post '/execute', sbvrUtils.checkPermissionsMiddleware('all'), uiModelLoaded, (req, res, next) ->
			sbvrUtils.runURI('GET', "/ui/textarea?$filter=name eq 'model_area'")
			.then((result) ->
				if result.d.length is 0
					throw new Error('Could not find the model to execute')
				seModel = result.d[0].text
				db.transaction()
				.then((tx) ->
					sbvrUtils.executeModel(tx, 'data', seModel)
					.then(->
						sbvrUtils.runURI('PATCH', "/ui/textarea?$filter=name eq 'model_area'", {
							is_disabled: true
							name: 'model_area'
						}, tx)
					).then(->
						tx.end()
					).catch((err) ->
						tx.rollback()
						throw err
					)
				)
			).then(->
				isServerOnAir(true)
				res.send(200)
			).catch((err) ->
				isServerOnAir(false)
				res.json(err, 404)
			)
		app.post '/validate', sbvrUtils.checkPermissionsMiddleware('get'), uiModelLoaded, (req, res, next) ->
			sbvrUtils.runRule('data', req.body.rule)
			.then((results) ->
				res.json(results)
			).catch((err) ->
				console.log('Error validating', err)
				res.send(404)
			)
		app.del '/cleardb', sbvrUtils.checkPermissionsMiddleware('delete'), (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList()
				.then((result) ->
					Promise.all result.rows.map (table) ->
						tx.dropTable(table.name)
				).then(->
					sbvrUtils.executeStandardModels(tx)
				).then(->
					setupModels(tx)
				).then(->
					tx.end()
					res.send(200)
				).catch((err) ->
					console.error('Error clearing db', err, err.stack)
					tx.rollback()
					res.send(503)
				)
		app.put '/importdb', sbvrUtils.checkPermissionsMiddleware('set'), (req, res, next) ->
			queries = req.body.split(";")
			db.transaction (tx) ->
				Promise.all(_.map queries, (query) ->
					query = query.trim()
					if query.length > 0
						tx.executeSql(query).catch((err) ->
							throw [query, err]
						)
				).then(->
					tx.end()
					res.send(200)
				).catch((err) ->
					console.error('Error importing db', err, err.stack)
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
						Promise.all(result.rows.map (table) ->
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
						)
					).then(->
						tx.end()
						res.json(exported)
					).catch((err) ->
						console.error('Error exporting db', err, err.stack)
						tx.rollback()
						res.send(503)
					)
		app.post '/backupdb', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList("name NOT LIKE '%_buk'")
				.then((result) ->
					Promise.all result.rows.map (currRow) ->
						tableName = currRow.name
						tx.dropTable(tableName + '_buk', true)
						.then(->
							tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName + '_buk";')
						)
				).then(->
					tx.end()
					res.send(200)
				).catch((err) ->
					tx.rollback()
					console.error('Error backing up db', err, err.stack)
					res.send(404)
				)
		app.post '/restoredb', sbvrUtils.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
			db.transaction (tx) ->
				tx.tableList("name LIKE '%_buk'")
				.then((result) ->
					Promise.all result.rows.map (currRow) ->
						tableName = currRow.name
						tx.dropTable(tableName[0...-4], true)
						.then(->
							tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName[0...-4] + '";')
						)
				).then(->
					tx.end()
					res.send(200)
				).catch((err) ->
					tx.rollback()
					console.error('Error restoring db', err, err.stack)
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

		app.del '/', uiModelLoaded, serverIsOnAir, (req, res, next) ->
			Promise.all([
				sbvrUtils.runURI('PATCH', "/ui/textarea?$filter=name eq 'model_area'",
					text: ''
					name: 'model_area'
					is_disabled: false
				)
				sbvrUtils.deleteModel('data')
			]).then(->
				isServerOnAir(false)
				res.send(200)
			)

		db.transaction()
		.then((tx) ->
			setupModels(tx)
			.then(->
				tx.end()
			).catch((err) ->
				tx.rollback()
				throw err
			)
		)
	return exports

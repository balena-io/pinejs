Promise = require 'bluebird'
permissions = require '../sbvr-api/permissions'

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
	resolve = null
	promise = new Promise (_resolve) ->
		resolve = _resolve
	(value) ->
		if value?
			if promise.isPending()
				resolve(value)
				resolve = null
			else
				promise = Promise.fulfilled(value)
		return promise

serverIsOnAir = (req, res, next) ->
	isServerOnAir().then (onAir) ->
		if onAir
			next()
		else
			next('route')

# Setup function
exports.config =
	models: [
		modelName: 'ui',
		modelText: uiModel
		apiRoot: 'ui'
		customServerCode: exports
	]
exports.setup = (app, sbvrUtils, db) ->
	uiApi = sbvrUtils.api.ui
	devApi = sbvrUtils.api.dev
	setupModels = (tx) ->
		uiApiTx = uiApi.clone
			passthrough:
				tx: tx
				req: permissions.root
		uiApiTx.get
			resource: 'textarea'
			options:
				select: 'id'
				filter:
					name: 'model_area'
		.then (result) ->
			if result.length is 0
				# Add a model_area entry if it doesn't already exist.
				uiApiTx.post
					resource: 'textarea'
					body:
						name: 'model_area'
						text: ' '
		.then ->
			devApi.get
				resource: 'model'
				passthrough:
					tx: tx
					req: permissions.rootRead
				options:
					select: ['is_of__vocabulary', 'model_value']
					filter:
						model_type: 'se'
						is_of__vocabulary: 'data'
		.then (result) ->
			if result.length is 0
				throw new Error('No SE data model found')
			instance = result[0]
			sbvrUtils.executeModel(tx,
				apiRoot: instance.is_of__vocabulary
				modelText: instance.model_value
			)
		.then ->
			isServerOnAir(true)
		.catch (err) ->
			isServerOnAir(false)

	app.get '/onAir', (req, res, next) ->
		isServerOnAir()
		.then (onAir) ->
			res.json(onAir)

	app.post '/update', permissions.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
		res.sendStatus(404)

	app.post '/execute', permissions.checkPermissionsMiddleware('all'), (req, res, next) ->
		uiApi.get
			resource: 'textarea'
			passthrough: req: permissions.rootRead
			options:
				select: 'text'
				filter:
					name: 'model_area'
		.then (result) ->
			if result.length is 0
				throw new Error('Could not find the model to execute')
			modelText = result[0].text
			db.transaction()
			.then (tx) ->
				sbvrUtils.executeModel(tx,
					apiRoot: 'data'
					modelText: modelText
				)
				.then ->
					uiApi.patch
						resource: 'textarea'
						passthrough:
							tx: tx
							req: permissions.root
						options:
							filter:
								name: 'model_area'
						body:
							is_disabled: true
				.then ->
					tx.end()
				.catch (err) ->
					tx.rollback()
					throw err
		.then ->
			isServerOnAir(true)
			res.sendStatus(200)
		.catch (err) ->
			isServerOnAir(false)
			res.status(404).json(err)
	app.post '/validate', permissions.checkPermissionsMiddleware('get'), (req, res, next) ->
		sbvrUtils.runRule('data', req.body.rule)
		.then (results) ->
			res.json(results)
		.catch (err) ->
			console.log('Error validating', err)
			res.sendStatus(404)
	app.delete '/cleardb', permissions.checkPermissionsMiddleware('delete'), (req, res, next) ->
		db.transaction (tx) ->
			tx.tableList()
			.then (result) ->
				Promise.all result.rows.map (table) ->
					tx.dropTable(table.name)
			.then ->
				sbvrUtils.executeStandardModels(tx)
			.then ->
				# TODO: HACK: This is usually done by config-loader and should be done there
				# In general cleardb is very destructive and should really go through a full "reboot" procedure to set everything up again.
				console.warn('DEL /cleardb is very destructive and should really be followed by a full restart/reload.')
				sbvrUtils.executeModels(tx, exports.config.models)
			.then ->
				setupModels(tx)
			.then ->
				tx.end()
				res.sendStatus(200)
			.catch (err) ->
				console.error('Error clearing db', err, err.stack)
				tx.rollback()
				res.sendStatus(503)
	app.put '/importdb', permissions.checkPermissionsMiddleware('set'), (req, res, next) ->
		queries = req.body.split(';')
		db.transaction (tx) ->
			Promise.reduce(
				queries
				(result, query) ->
					query = query.trim()
					if query.length > 0
						tx.executeSql(query).catch((err) ->
							throw [query, err]
						)
				null
			).then ->
				tx.end()
				res.sendStatus(200)
			.catch (err) ->
				console.error('Error importing db', err, err.stack)
				tx.rollback()
				res.sendStatus(404)
	app.get '/exportdb', permissions.checkPermissionsMiddleware('get'), (req, res, next) ->
		db.transaction (tx) ->
			tx.tableList("name NOT LIKE '%_buk'")
			.then (result) ->
				exported = ''
				Promise.all result.rows.map (table) ->
					tableName = table.name
					exported += 'DROP TABLE IF EXISTS "' + tableName + '";\n'
					exported += table.sql + ';\n'
					tx.executeSql('SELECT * FROM "' + tableName + '";')
					.then (result) ->
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
							insQuery += ') values (' + valQuery + ');\n'
						exported += insQuery
				.then ->
					tx.end()
					res.json(exported)
			.catch (err) ->
				console.error('Error exporting db', err, err.stack)
				tx.rollback()
				res.sendStatus(503)
	app.post '/backupdb', permissions.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
		db.transaction (tx) ->
			tx.tableList("name NOT LIKE '%_buk'")
			.then (result) ->
				Promise.all result.rows.map (currRow) ->
					tableName = currRow.name
					tx.dropTable(tableName + '_buk', true)
					.then ->
						tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName + '_buk";')
			.then ->
				tx.end()
				res.sendStatus(200)
			.catch (err) ->
				tx.rollback()
				console.error('Error backing up db', err, err.stack)
				res.sendStatus(404)
	app.post '/restoredb', permissions.checkPermissionsMiddleware('all'), serverIsOnAir, (req, res, next) ->
		db.transaction (tx) ->
			tx.tableList("name LIKE '%_buk'")
			.then (result) ->
				Promise.all result.rows.map (currRow) ->
					tableName = currRow.name
					tx.dropTable(tableName[0...-4], true)
					.then ->
						tx.executeSql('ALTER TABLE "' + tableName + '" RENAME TO "' + tableName[0...-4] + '";')
			.then ->
				tx.end()
				res.sendStatus(200)
			.catch (err) ->
				tx.rollback()
				console.error('Error restoring db', err, err.stack)
				res.sendStatus(404)

	app.all('/data/*', serverIsOnAir, sbvrUtils.handleODataRequest)
	app.get('/Auth/*', serverIsOnAir, sbvrUtils.handleODataRequest)
	app.merge('/ui/*', sbvrUtils.handleODataRequest)
	app.patch('/ui/*', sbvrUtils.handleODataRequest)


	app.delete '/', serverIsOnAir, (req, res, next) ->
		Promise.all([
			uiApi.patch
				resource: 'textarea'
				passthrough: req: permissions.root
				options:
					filter:
						name: 'model_area'
				body:
					text: ''
					name: 'model_area'
					is_disabled: false
			sbvrUtils.deleteModel('data')
		]).then ->
			isServerOnAir(false)
			res.sendStatus(200)

	db.transaction()
	.then (tx) ->
		setupModels(tx)
		.then ->
			tx.end()
		.catch (err) ->
			tx.rollback()
			throw err

define [ 'bluebird' ], (Promise) ->
	setup: (@db, @migrationsApi, @devApi) ->
		@logger = @migrationsApi.logger

	run: (model) ->
		modelName = model.apiRoot
		console.log "Running migrations for", modelName

    # migrations only run if the model has been executed before,
		# to make changes that can't be automatically applied

		@checkModelAlreadyExists(modelName)
		.then (exists) =>
			return if not exists

			@getExecutedMigrations(modelName)
			.then (executedMigrations) =>
				@filterPendingMigrations(model.migrations, executedMigrations)
			.then (pendingMigrations) =>
				return if not _.any(pendingMigrations)
				@executeMigrations(pendingMigrations)
		.then (newMigrationCount) =>
			return unless newMigrationCount > 0
			@setExecutedMigrations(modelName, _.keys(model.migrations))

	checkModelAlreadyExists: (modelName) ->
		@devApi.get
			resource: 'model'
			options:
				select: 'id'
				filter:
					vocabulary: modelName
		.then (results) ->
			_.any(results)

	getExecutedMigrations: (modelName) ->
		@migrationsApi.get
			resource: 'migration'
			options:
				select: [ 'executed_migrations' ]
				filter:
					model_name: modelName
		.get(0).then (data) ->
			if data?.executed_migrations
				JSON.parse(data.executed_migrations)
			else
				[]

	setExecutedMigrations: (modelName, executedMigrations) ->
		@migrationsApi.put
			resource: 'migration'
			id: modelName
			body:
				model_name: modelName
				executed_migrations: JSON.stringify(executedMigrations)

	filterPendingMigrations: (migrations, executedMigrations) ->
		_.reject migrations, (migration, key) ->
			_.contains(executedMigrations, key)

	executeMigrations: (migrations=[]) ->
		@db.transaction().then (tx) ->
			Promise.all _.map migrations, (migration) ->
				switch typeof migration
					when 'function'
						migration(tx)
					when 'string'
						tx.executeSql(migration)
			.then ->
				tx.end()
			.return(migrations.length)
			.catch ->
				tx.rollback()


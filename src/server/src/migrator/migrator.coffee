define [ 'lodash', 'bluebird', 'typed-error', 'text!migrator/migrations.sbvr' ], (_, Promise, TypedError, modelText) ->
	MigrationError: class MigrationError extends TypedError

	run: (model) ->
		if not _.any(model.migrations)
			return Promise.fulfilled()

		modelName = model.apiRoot

		# migrations only run if the model has been executed before,
		# to make changes that can't be automatically applied
		@checkModelAlreadyExists(modelName)
		.then (exists) =>
			if not exists
				@logger.info "First time model has executed, skipping migrations"
				return @setExecutedMigrations(modelName, _.keys(model.migrations))

			@getExecutedMigrations(modelName)
			.then (executedMigrations) =>
				pendingMigrations = @filterAndSortPendingMigrations(model.migrations, executedMigrations)
				return if not _.any(pendingMigrations)

				@executeMigrations(pendingMigrations)
				.then (newlyExecutedMigrations) =>
					@setExecutedMigrations(modelName, [ executedMigrations..., newlyExecutedMigrations... ])

	# this call sometimes takes *five seconds*, please optimise the platform API
	checkModelAlreadyExists: (modelName) ->
		@sbvrUtils.api.dev.get
			resource: 'model'
			options:
				select: [ 'vocabulary' ]
				top: '1'
				filter:
					vocabulary: modelName
		.then (results) ->
			_.any(results)

	getExecutedMigrations: (modelName) ->
		@migrationsApi.get
			resource: 'migration'
			id: modelName
			options:
				select: [ 'executed_migrations' ]
		.then (data) ->
			data?.executed_migrations || []

	setExecutedMigrations: (modelName, executedMigrations) ->
		@migrationsApi.put
			resource: 'migration'
			id: modelName
			body:
				model_name: modelName
				executed_migrations: executedMigrations

	# turns {"key1": migration, "key3": migration, "key2": migration}
	# into  [["key1", migration], ["key2", migration], ["key3", migration]]
	filterAndSortPendingMigrations: (migrations, executedMigrations) ->
		_(migrations)
		.omit(executedMigrations)
		.pairs()
		.sortBy(_.first)
		.value()

	executeMigrations: (migrations=[]) ->
		@db.transaction()
		.tap (tx) =>
			Promise.map(migrations, @executeMigration.bind(this, tx), concurrency: 1)
			.catch (err) =>
				tx.rollback().then =>
					@logger.error "Error while executing migrations, rolled back"
					throw new MigrationError(err)
		.then (tx) ->
			tx.end()
		.return(_.map(migrations, _.first)) # return migration keys

	executeMigration: (tx, [ key, migration ]) ->
		@logger.info "Running migration #{JSON.stringify key}"

		switch typeof migration
			when 'function'
				migration(tx, @sbvrUtils)
			when 'string'
				tx.executeSql(migration)

	config:
		models: [
			modelName: 'migrations'
			apiRoot: 'migrations'
			modelText: modelText
			customServerCode: 'cs!migrator/migrator'
		]

	setup: (app, requirejs, @sbvrUtils, @db, callback) ->
		@migrationsApi = @sbvrUtils.api.migrations
		@logger = @migrationsApi.logger

		callback()


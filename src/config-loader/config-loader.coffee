_ = require 'lodash'
Promise = require 'bluebird'
sbvrUtils = require '../sbvr-api/sbvr-utils'
permissions = require '../sbvr-api/permissions'
fs = Promise.promisifyAll(require('fs'))

# Setup function
exports.setup = (app) ->
	loadConfig = (data) ->
		sbvrUtils.db.transaction (tx) ->
			Promise.map data.models, (model) ->
				if model.modelText?
					sbvrUtils.executeModel(tx, model)
					.then ->
						console.info('Sucessfully executed ' + model.modelName + ' model.')
					.catch (err) ->
						throw new Error(['Failed to execute ' + model.modelName + ' model from ' + model.modelFile, err, err.stack])
			.then ->
				authApiTx = sbvrUtils.api.Auth.clone
					passthrough:
						tx: tx
						req: permissions.root

				if data.users?
					permissions = {}
					for user in data.users when user.permissions?
						_.each user.permissions, (permissionName) ->
							permissions[permissionName] ?=
								authApiTx.get
									resource: 'permission'
									options:
										$select: 'id'
										$filter:
											name: permissionName
								.then (result) ->
									if result.length is 0
										authApiTx.post
											resource: 'permission'
											body:
												name: permissionName
											customOptions: { returnResource: false }
										.get('id')
									else
										return result[0].id
								.tapCatch (e) ->
									e.message = 'Could not create or find permission "' + permissionName + '": ' + e.message

					Promise.map data.users, (user) ->
						authApiTx.get
							resource: 'user'
							options:
								$select: 'id'
								$filter:
									username: user.username
						.then (result) ->
							if result.length is 0
								authApiTx.post
									resource: 'user'
									body:
										username: user.username
										password: user.password
									customOptions: { returnResource: false }
								.get('id')
							else
								return result[0].id
						.then (userID) ->
							if user.permissions?
								Promise.map user.permissions, (permissionName) ->
									permissions[permissionName]
									.then (permissionID) ->
										authApiTx.get
											resource: 'user__has__permission'
											options:
												$select: 'id'
												$filter:
													user: userID
													permission: permissionID
										.then (result) ->
											if result.length is 0
												authApiTx.post
													resource: 'user__has__permission'
													body:
														user: userID
														permission: permissionID
													customOptions: { returnResource: false }
						.tapCatch (e) ->
							e.message = 'Could not create or find user "' + user.username + '": ' + e.message
		.then ->
			Promise.map data.models, (model) ->
				if model.modelText?
					apiRoute = '/' + model.apiRoot + '/*'
					app.options(apiRoute, (req, res) -> res.sendStatus(200))
					app.all(apiRoute, sbvrUtils.handleODataRequest)

				if model.customServerCode?
					if _.isObject(model.customServerCode)
						customCode = model.customServerCode
					else
						try
							customCode = nodeRequire(model.customServerCode)
						catch e
							e.message = 'Error loading custom server code: ' + e.message
							throw e

					if !_.isFunction(customCode.setup)
						return

					try
						new Promise (resolve, reject) ->
							promise = customCode.setup app, sbvrUtils, sbvrUtils.db, (err) ->
								if err
									reject(err)
								else
									resolve()

							if Promise.is(promise)
								resolve(promise)
					catch e
						e.message = 'Error running custom server code: ' + e.message
						throw e

	loadJSON = (path) ->
		console.info('Loading JSON:', path)
		json = fs.readFileSync(path, 'utf8')
		return JSON.parse(json)

	loadApplicationConfig = (config) ->
		if !require.extensions['.coffee']?
			try
				# Try to register the coffee-script loader if it doesn't exist
				# We ignore if it fails though, since that probably just means it is not available/needed.
				require('coffee-script/register')
		if !require.extensions['.ts']?
			try
				require('ts-node/register')

		path = require('path')

		console.info('Loading application config')
		switch typeof config
			when 'undefined'
				root = process.argv[2] or __dirname
				config = loadJSON(path.join(root, 'config.json'))
			when 'string'
				root = path.dirname(config)
				config = loadJSON(config)
			when 'object'
				root = process.cwd()

		Promise.map config.models, (model) ->
			fs.readFileAsync(path.join(root, model.modelFile), 'utf8')
			.then (modelText) ->
				model.modelText = modelText
				if model.customServerCode?
					model.customServerCode = root + '/' + model.customServerCode
			.then ->
				model.migrations ||= {}

				if model.migrationsPath
					migrationsPath = path.join(root, model.migrationsPath)
					delete model.migrationsPath

					fs.readdirAsync(migrationsPath)
					.map (filename) ->
						filePath = path.join(migrationsPath, filename)
						migrationKey = filename.split('-')[0]

						switch path.extname(filename)
							when '.coffee', '.js'
								fn = nodeRequire(filePath)
								model.migrations[migrationKey] = fn
							when '.sql'
								fs.readFileAsync(filePath)
								.then (sqlBuffer) ->
									model.migrations[migrationKey] = sqlBuffer.toString()
							else
								console.error("Unrecognised migration file extension, skipping: #{path.extname filename}")
		.then ->
			loadConfig(config)
		.catch (err) ->
			console.error('Error loading application config', err, err.stack)
			process.exit(1)

	return {
		loadConfig
		loadApplicationConfig
	}

_ = require 'lodash'
Bluebird = require 'bluebird'
transactionModel = require './transaction.sbvr'

exports.config =
	models: [
		apiRoot: 'transaction'
		modelText: transactionModel
		customServerCode: exports
		migrations: {
			'11.0.0-modified-at': '''
				ALTER TABLE "conditional field"
				ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				ALTER TABLE "conditional resource"
				ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				ALTER TABLE "lock"
				ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				ALTER TABLE "resource"
				ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				ALTER TABLE "resource-is under-lock"
				ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				ALTER TABLE "transaction"
				ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
			'''
		}
	]
exports.setup = (app, sbvrUtils) ->
	exports.addModelHooks = (modelName) ->
		# TODO: Add checks on POST/PATCH requests as well.
		sbvrUtils.addPureHook 'PUT', modelName, 'all', ({ tx, request }) ->
			vocab = request.vocabulary
			{ logger } = sbvrUtils.api[vocab]
			id = sbvrUtils.getID(vocab, request)
			tx.executeSql('''
				SELECT NOT EXISTS(
					SELECT 1
					FROM "resource" r
					JOIN "resource-is under-lock" AS rl ON rl."resource" = r."id"
					WHERE r."resource type" = ?
					AND r."resource id" = ?
				) AS result;''', [request.resourceName, id]
			)
			.catch (err) ->
				logger.error('Unable to check resource locks', err, err.stack)
				throw new Error('Unable to check resource locks')
			.then (result) ->
				if result.rows[0].result in [false, 0, '0']
					throw new Error('The resource is locked and cannot be edited')

		endTransaction = (transactionID) ->
			sbvrUtils.db.transaction (tx) ->
				placeholders = {}
				getLockedRow = (lockID) ->
					# 'GET', '/transaction/resource?$select=resource_id&$filter=resource__is_under__lock/lock eq ?'
					tx.executeSql('''SELECT "resource"."resource id" AS "resource_id"
									FROM "resource",
										"resource-is under-lock"
									WHERE "resource"."id" = "resource-is under-lock"."resource"
									AND "resource-is under-lock"."lock" = ?;''', [lockID])
				getFieldsObject = (conditionalResourceID, clientModel) ->
					# 'GET', '/transaction/conditional_field?$select=field_name,field_value&$filter=conditional_resource eq ?'
					tx.executeSql('''SELECT "conditional field"."field name" AS "field_name", "conditional field"."field value" AS "field_value"
									FROM "conditional field"
									WHERE "conditional field"."conditional resource" = ?;''', [conditionalResourceID])
					.then (fields) ->
						fieldsObject = {}
						Bluebird.all fields.rows.map (field) ->
							fieldName = field.field_name.replace(clientModel.resourceName + '.', '')
							fieldValue = field.field_value
							modelField = _.find(clientModel.fields, { fieldName })
							if modelField.dataType == 'ForeignKey' and Number.isNaN(Number(fieldValue))
								if !placeholders.hasOwnProperty(fieldValue)
									throw new Error('Cannot resolve placeholder' + fieldValue)
								else
									placeholders[fieldValue].promise
									.then (resolvedID) ->
										fieldsObject[fieldName] = resolvedID
									.catch ->
										throw new Error('Placeholder failed' + fieldValue)
							else
								fieldsObject[fieldName] = fieldValue
						.then ->
							return fieldsObject

				# 'GET', '/transaction/conditional_resource?$select=id,lock,resource_type,conditional_type,placeholder&$filter=transaction eq ?'
				tx.executeSql('''
					SELECT "conditional resource"."id", "conditional resource"."lock", "conditional resource"."resource type" AS "resource_type",
					"conditional resource"."conditional type" AS "conditional_type", "conditional resource"."placeholder"
					FROM "conditional resource"
					WHERE "conditional resource"."transaction" = ?;
				''', [transactionID])
				.then (conditionalResources) ->
					conditionalResources.rows.forEach (conditionalResource) ->
						placeholder = conditionalResource.placeholder
						if placeholder? and placeholder.length > 0
							placeholders[placeholder] = {}
							placeholders[placeholder].promise = new Bluebird (resolve, reject) ->
								placeholders[placeholder].resolve = resolve
								placeholders[placeholder].reject = reject

					# get conditional resources (if exist)
					Bluebird.all conditionalResources.rows.map (conditionalResource) ->
						placeholder = conditionalResource.placeholder
						lockID = conditionalResource.lock
						doCleanup = ->
							Bluebird.all([
								tx.executeSql('DELETE FROM "conditional field" WHERE "conditional resource" = ?;', [conditionalResource.id])
								tx.executeSql('DELETE FROM "conditional resource" WHERE "lock" = ?;', [lockID])
								tx.executeSql('DELETE FROM "resource-is under-lock" WHERE "lock" = ?;', [lockID])
								tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lockID])
							])

						passthrough = { tx }

						clientModel = clientModels[modelName].resources[conditionalResource.resource_type]
						url = modelName + '/' + conditionalResource.resource_type
						switch conditionalResource.conditional_type
							when 'DELETE'
								getLockedRow(lockID)
								.then (lockedRow) ->
									lockedRow = lockedRow.rows[0]
									url = url + '?$filter=' + clientModel.idField + ' eq ' + lockedRow.resource_id
									sbvrUtils.PinejsClient::delete({ url, passthrough })
								.then(doCleanup)
							when 'EDIT'
								getLockedRow(lockID)
								.then (lockedRow) ->
									lockedRow = lockedRow.rows[0]
									getFieldsObject(conditionalResource.id, clientModel)
									.then (body) ->
										body[clientModel.idField] = lockedRow.resource_id
										sbvrUtils.PinejsClient::put({ url, body, passthrough })
								.then(doCleanup)
							when 'ADD'
								getFieldsObject(conditionalResource.id, clientModel)
								.then (body) ->
									sbvrUtils.PinejsClient::post({ url, body, passthrough })
								.then (result) ->
									placeholders[placeholder].resolve(result.id)
								.then(doCleanup)
								.tapCatch (err) ->
									placeholders[placeholder].reject(err)
									return
				.then (err) ->
					tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [transactionID])
				.then (result) ->
					sbvrUtils.validateModel(tx, modelName)

		# TODO: these really should be specific to the model - currently they will only work for the first model added
		app.post '/transaction/execute', (req, res, next) ->
			id = Number(req.body.id)
			if Number.isNaN(id)
				res.sendStatus(404)
			else
				endTransaction(id)
				.then ->
					res.sendStatus(200)
				.catch (err) ->
					console.error('Error ending transaction', err, err.stack)
					res.status(404).json(err)
		app.get '/transaction', (req, res, next) ->
			res.json(
				transactionURI: '/transaction/transaction'
				conditionalResourceURI: '/transaction/conditional_resource'
				conditionalFieldURI: '/transaction/conditional_field'
				lockURI: '/transaction/lock'
				transactionLockURI: '/transaction/lock__belongs_to__transaction'
				resourceURI: '/transaction/resource'
				lockResourceURI: '/transaction/resource__is_under__lock'
				exclusiveLockURI: '/transaction/lock__is_exclusive'
				commitTransactionURI: '/transaction/execute'
			)
		app.all('/transaction/*', sbvrUtils.handleODataRequest)

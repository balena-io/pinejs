define [
	'exports'
	'lodash'
	'bluebird'
], (exports, _, Promise) ->
	exports.setup = (app, requirejs, sbvrUtils) ->
		endTransaction = (transactionID) ->
			sbvrUtils.db.transaction()
			.then (tx) ->
				placeholders = {}
				getLockedRow = (lockID) ->
					# 'GET', '/transaction/resource?$select=resource_id&$filter=resource__is_under__lock/lock eq ?'
					tx.executeSql('''SELECT "resource"."resource id" AS "resource_id"
									FROM "resource",
										"resource-is_under-lock"
									WHERE "resource"."id" = "resource-is_under-lock"."resource"
									AND "resource-is_under-lock"."lock" = ?;''', [lockID])
				getFieldsObject = (conditionalResourceID, clientModel) ->
					# 'GET', '/transaction/conditional_field?$select=field_name,field_value&$filter=conditional_resource eq ?'
					tx.executeSql('''SELECT "conditional_field"."field name" AS "field_name", "conditional_field"."field value" AS "field_value"
									FROM "conditional_field"
									WHERE "conditional_field"."conditional resource" = ?;''', [conditionalResourceID])
					.then (fields) ->
						fieldsObject = {}
						Promise.all fields.rows.map (field) ->
							fieldName = field.field_name.replace(clientModel.resourceName + '.', '')
							fieldValue = field.field_value
							modelField = _.find(clientModel.fields, {fieldName})
							if modelField.dataType == 'ForeignKey' and _.isNaN(Number(fieldValue))
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

				# 'GET', '/transaction/conditional_resource?$filter=transaction eq ?'
				tx.executeSql('''SELECT "conditional_resource"."id", "conditional_resource"."transaction", "conditional_resource"."lock", "conditional_resource"."resource type" AS "resource_type", "conditional_resource"."conditional type" AS "conditional_type", "conditional_resource"."placeholder"
								FROM "conditional_resource"
								WHERE "conditional_resource"."transaction" = ?;''', [transactionID])
				.then (conditionalResources) ->
					conditionalResources.rows.forEach (conditionalResource) ->
						placeholder = conditionalResource.placeholder
						if placeholder? and placeholder.length > 0
							placeholders[placeholder] = Promise.pending()

					# get conditional resources (if exist)
					Promise.all conditionalResources.rows.map (conditionalResource) ->
						placeholder = conditionalResource.placeholder
						lockID = conditionalResource.lock
						doCleanup = ->
							Promise.all([
								tx.executeSql('DELETE FROM "conditional_field" WHERE "conditional resource" = ?;', [conditionalResource.id])
								tx.executeSql('DELETE FROM "conditional_resource" WHERE "lock" = ?;', [lockID])
								tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lockID])
								tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lockID])
							])

						clientModel = clientModels['data'].resources[conditionalResource.resource_type]
						url = 'data/' + conditionalResource.resource_type
						switch conditionalResource.conditional_type
							when 'DELETE'
								getLockedRow(lockID)
								.then (lockedRow) ->
									lockedRow = lockedRow.rows.item(0)
									url = url + '?$filter=' + clientModel.idField + ' eq ' + lockedRow.resource_id
									sbvrUtils.PlatformAPI::delete({url, tx})
								.then(doCleanup)
							when 'EDIT'
								getLockedRow(lockID)
								.then (lockedRow) ->
									lockedRow = lockedRow.rows.item(0)
									getFieldsObject(conditionalResource.id, clientModel)
									.then (body) ->
										body[clientModel.idField] = lockedRow.resource_id
										sbvrUtils.PlatformAPI::put({url, body, tx})
								.then(doCleanup)
							when 'ADD'
								getFieldsObject(conditionalResource.id, clientModel)
								.then (body) ->
									sbvrUtils.PlatformAPI::post({url, body, tx})
								.then (result) ->
									placeholders[placeholder].fulfill(result.id)
								.then(doCleanup)
								.catch (err) ->
									placeholders[placeholder].reject(err)
									throw err
				.then (err) ->
					tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [transactionID])
				.then (result) ->
					# TODO: This should handle transactions on other models/on multiple models
					sbvrUtils.validateModel(tx, 'data')
				.catch (err) ->
					tx.rollback()
					throw err
				.then ->
					tx.end()

		validateDB = (tx, sqlmod) ->
			Promise.map sqlmod.rules, (rule) ->
				tx.executeSql(rule.sql, rule.bindings)
				.then (result) ->
					if result.rows.item(0).result in [false, 0, '0']
						throw rule.structuredEnglish

		exports.check = (tx, request) ->
			vocab = request.vocabulary
			{logger} = sbvrUtils.api[vocab]
			id = sbvrUtils.getID(vocab, request)
			tx.executeSql('''
				SELECT NOT EXISTS(
					SELECT 1
					FROM "resource" r
					JOIN "resource-is_under-lock" AS rl ON rl."resource" = r."id"
					WHERE r."resource type" = ?
					AND r."resource id" = ?
				) AS result;''', [request.resourceName, id]
			)
			.catch (err) ->
				logger.error('Unable to check resource locks', err, err.stack)
				throw new Error('Unable to check resource locks')
			.then (result) ->
				if result.rows.item(0).result in [false, 0, '0']
					throw new Error('The resource is locked and cannot be edited')

		app.post '/transaction/execute', (req, res, next) ->
			id = Number(req.body.id)
			if _.isNaN(id)
				res.send(404)
			else
				endTransaction(id)
				.then ->
					res.send(200)
				.catch (err) ->
					console.error('Error ending transaction', err, err.stack)
					res.json(err, 404)
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

	return exports

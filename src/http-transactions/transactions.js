import * as _ from 'lodash';
import { odataNameToSqlName } from '@balena/odata-to-abstract-sql';
// @ts-ignore
const transactionModel = require('./transaction.sbvr');

export let config = {
	models: [
		{
			apiRoot: 'transaction',
			modelText: transactionModel,
			customServerCode: { setup },
			migrations: {
				'11.0.0-modified-at': `\
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
ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;\
`,
			},
		},
	],
};

/** @type {(modelName: string) => void} */
export let addModelHooks;

/** @type { import('../config-loader/config-loader').SetupFunction } */
export function setup(app, sbvrUtils) {
	addModelHooks = (modelName) => {
		// TODO: Add checks on POST/PATCH requests as well.
		sbvrUtils.addPureHook('PUT', modelName, 'all', {
			async PRERUN({ tx, request }) {
				const vocab = request.vocabulary;
				const { logger } = sbvrUtils.api[vocab];
				const id = sbvrUtils.getID(vocab, request);
				let result;
				try {
					result = await tx.executeSql(
						`\
SELECT NOT EXISTS(
	SELECT 1
	FROM "resource" r
	JOIN "resource-is under-lock" AS rl ON rl."resource" = r."id"
	WHERE r."resource type" = ?
	AND r."resource id" = ?
) AS result;`,
						[request.resourceName, id],
					);
				} catch (err) {
					logger.error('Unable to check resource locks', err, err.stack);
					throw new Error('Unable to check resource locks');
				}
				if ([false, 0, '0'].includes(result.rows[0].result)) {
					throw new Error('The resource is locked and cannot be edited');
				}
			},
		});

		const endTransaction = (/** @type {number} */ transactionID) =>
			sbvrUtils.db.transaction(async (tx) => {
				/** @type {{[key: string]: { promise: Promise<any>, resolve: Function, reject: Function }}} */
				const placeholders = {};
				const getLockedRow = (
					/** @type {number} */ lockID, // 'GET', '/transaction/resource?$select=resource_id&$filter=resource__is_under__lock/lock eq ?'
				) =>
					tx.executeSql(
						`SELECT "resource"."resource id" AS "resource_id"
FROM "resource",
"resource-is under-lock"
WHERE "resource"."id" = "resource-is under-lock"."resource"
AND "resource-is under-lock"."lock" = ?;`,
						[lockID],
					);
				const getFieldsObject = async (
					/** @type {number} */ conditionalResourceID,
					/** @type {import('@balena/abstract-sql-compiler').AbstractSqlTable} */ clientModel, // 'GET', '/transaction/conditional_field?$select=field_name,field_value&$filter=conditional_resource eq ?'
				) => {
					const fields = await tx.executeSql(
						`SELECT "conditional field"."field name" AS "field_name", "conditional field"."field value" AS "field_value"
FROM "conditional field"
WHERE "conditional field"."conditional resource" = ?;`,
						[conditionalResourceID],
					);
					/** @type {{[key: string]: any}} */
					const fieldsObject = {};
					await Promise.all(
						fields.rows.map(async (field) => {
							const fieldName = field.field_name.replace(
								clientModel.resourceName + '.',
								'',
							);
							const fieldValue = field.field_value;
							const modelField = clientModel.fields.find(
								(f) => f.fieldName === fieldName,
							);
							if (modelField == null) {
								throw new Error(`Invalid field: ${fieldName}`);
							}
							if (
								modelField.dataType === 'ForeignKey' &&
								Number.isNaN(Number(fieldValue))
							) {
								if (!placeholders.hasOwnProperty(fieldValue)) {
									throw new Error('Cannot resolve placeholder' + fieldValue);
								} else {
									try {
										const resolvedID = await placeholders[fieldValue].promise;
										fieldsObject[fieldName] = resolvedID;
									} catch {
										throw new Error('Placeholder failed' + fieldValue);
									}
								}
							} else {
								fieldsObject[fieldName] = fieldValue;
							}
						}),
					);
					return fieldsObject;
				};

				// 'GET', '/transaction/conditional_resource?$select=id,lock,resource_type,conditional_type,placeholder&$filter=transaction eq ?'
				const conditionalResources = await tx.executeSql(
					`\
SELECT "conditional resource"."id", "conditional resource"."lock", "conditional resource"."resource type" AS "resource_type",
"conditional resource"."conditional type" AS "conditional_type", "conditional resource"."placeholder"
FROM "conditional resource"
WHERE "conditional resource"."transaction" = ?;\
`,
					[transactionID],
				);

				conditionalResources.rows.forEach((conditionalResource) => {
					const { placeholder } = conditionalResource;
					if (placeholder != null && placeholder.length > 0) {
						/** @type {Function} */
						let resolve;
						/** @type {Function} */
						let reject;
						const promise = new Promise(($resolve, $reject) => {
							resolve = $resolve;
							reject = $reject;
						});
						// @ts-ignore
						placeholders[placeholder] = { promise, resolve, reject };
					}
				});

				// get conditional resources (if exist)
				await Promise.all(
					conditionalResources.rows.map(async (conditionalResource) => {
						const { placeholder } = conditionalResource;
						const lockID = conditionalResource.lock;
						const doCleanup = () =>
							Promise.all([
								tx.executeSql(
									'DELETE FROM "conditional field" WHERE "conditional resource" = ?;',
									[conditionalResource.id],
								),
								tx.executeSql(
									'DELETE FROM "conditional resource" WHERE "lock" = ?;',
									[lockID],
								),
								tx.executeSql(
									'DELETE FROM "resource-is under-lock" WHERE "lock" = ?;',
									[lockID],
								),
								tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lockID]),
							]);

						const passthrough = { tx };

						const clientModel = sbvrUtils.getAbstractSqlModel({
							vocabulary: modelName,
						}).tables[odataNameToSqlName(conditionalResource.resource_type)];
						let url = modelName + '/' + conditionalResource.resource_type;
						switch (conditionalResource.conditional_type) {
							case 'DELETE': {
								const lockedResult = await getLockedRow(lockID);
								const lockedRow = lockedResult.rows[0];
								url =
									url +
									'?$filter=' +
									clientModel.idField +
									' eq ' +
									lockedRow.resource_id;
								await sbvrUtils.PinejsClient.prototype.delete({
									url,
									passthrough,
								});
								await doCleanup();
								return;
							}
							case 'EDIT': {
								const lockedResult = await getLockedRow(lockID);
								const lockedRow = lockedResult.rows[0];
								const body = await getFieldsObject(
									conditionalResource.id,
									clientModel,
								);
								body[clientModel.idField] = lockedRow.resource_id;
								await sbvrUtils.PinejsClient.prototype.put({
									url,
									body,
									passthrough,
								});
								await doCleanup();
								return;
							}
							case 'ADD': {
								try {
									const body = await getFieldsObject(
										conditionalResource.id,
										clientModel,
									);
									/** @type { {[key: string]: any} } */
									const result = await sbvrUtils.PinejsClient.prototype.post({
										url,
										body,
										passthrough,
									});
									placeholders[placeholder].resolve(
										result[clientModel.idField],
									);
									await doCleanup();
								} catch (err) {
									placeholders[placeholder].reject(err);
									throw err;
								}
								return;
							}
						}
					}),
				);
				await tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [
					transactionID,
				]);
				await sbvrUtils.validateModel(tx, modelName);
			});

		// TODO: these really should be specific to the model - currently they will only work for the first model added
		app.post('/transaction/execute', async (req, res) => {
			const id = Number(req.body.id);
			if (Number.isNaN(id)) {
				res.sendStatus(404);
			} else {
				try {
					await endTransaction(id);

					res.sendStatus(200);
				} catch (err) {
					console.error('Error ending transaction', err, err.stack);
					res.status(404).json(err);
				}
			}
		});
		app.get('/transaction', (_req, res) => {
			res.json({
				transactionURI: '/transaction/transaction',
				conditionalResourceURI: '/transaction/conditional_resource',
				conditionalFieldURI: '/transaction/conditional_field',
				lockURI: '/transaction/lock',
				transactionLockURI: '/transaction/lock__belongs_to__transaction',
				resourceURI: '/transaction/resource',
				lockResourceURI: '/transaction/resource__is_under__lock',
				exclusiveLockURI: '/transaction/lock__is_exclusive',
				commitTransactionURI: '/transaction/execute',
			});
		});
		app.all('/transaction/*', sbvrUtils.handleODataRequest);
	};
}

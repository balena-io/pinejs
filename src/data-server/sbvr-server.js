/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import * as Bluebird from 'bluebird';
import * as permissions from '../sbvr-api/permissions';

const uiModel = `\
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
	Necessity: Each textarea has exactly 1 text`;

// Middleware
const isServerOnAir = (() => {
	/** @type { ((thenableOrResult?: import('../sbvr-api/common-types').Resolvable<boolean>) => void) | undefined } */
	let resolve;
	let promise = new Bluebird(($resolve) => {
		resolve = $resolve;
	});
	return (/** @type {boolean} */ value) => {
		if (value != null) {
			if (resolve != null) {
				resolve(value);
				resolve = undefined;
			} else {
				promise = Bluebird.resolve(value);
			}
		}
		return promise;
	};
})();

/** @type { import('express').Handler } */
const serverIsOnAir = (_req, _res, next) =>
	isServerOnAir().then((onAir) => {
		if (onAir) {
			next();
		} else {
			next('route');
		}
	});

export let config = {
	models: [
		{
			modelName: 'ui',
			modelText: uiModel,
			apiRoot: 'ui',
			customServerCode: { setup },
			migrations: {
				'11.0.0-modified-at': `\
ALTER TABLE "textarea"
ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;\
`,
			},
		},
	],
};

/** @type { import('../config-loader/config-loader').SetupFunction } */
export function setup(app, sbvrUtils, db) {
	const uiApi = sbvrUtils.api.ui;
	const devApi = sbvrUtils.api.dev;
	const setupModels = (
		/** @type { import('../database-layer/db').Tx } */ tx,
	) => {
		const uiApiTx = uiApi.clone({
			passthrough: {
				tx,
				req: permissions.root,
			},
		});
		return uiApiTx
			.get({
				resource: 'textarea',
				options: {
					$select: 'id',
					$filter: {
						name: 'model_area',
					},
				},
			})
			.then((/** @type { Array<{ [key: string]: any }> } */ result) => {
				if (result.length === 0) {
					// Add a model_area entry if it doesn't already exist.
					return uiApiTx.post({
						resource: 'textarea',
						body: {
							name: 'model_area',
							text: ' ',
						},
					});
				}
			})
			.then(() =>
				devApi.get({
					resource: 'model',
					passthrough: {
						tx,
						req: permissions.rootRead,
					},
					options: {
						$select: ['is_of__vocabulary', 'model_value'],
						$filter: {
							model_type: 'se',
							is_of__vocabulary: 'data',
						},
					},
				}),
			)
			.then((/** @type { Array<{ [key: string]: any }> } */ result) => {
				if (result.length === 0) {
					throw new Error('No SE data model found');
				}
				const instance = result[0];
				return sbvrUtils.executeModel(tx, {
					apiRoot: instance.is_of__vocabulary,
					modelText: instance.model_value,
				});
			})
			.then(() => isServerOnAir(true))
			.catch(() => isServerOnAir(false));
	};

	app.get('/onAir', (_req, res) => {
		isServerOnAir().then((onAir) => {
			res.json(onAir);
		});
	});

	app.post(
		'/update',
		permissions.checkPermissionsMiddleware('all'),
		serverIsOnAir,
		(_req, res) => {
			res.sendStatus(404);
		},
	);

	app.post(
		'/execute',
		permissions.checkPermissionsMiddleware('all'),
		(_req, res) => {
			uiApi
				.get({
					resource: 'textarea',
					passthrough: { req: permissions.rootRead },
					options: {
						$select: 'text',
						$filter: {
							name: 'model_area',
						},
					},
				})
				.then((/** @type { Array<{ [key: string]: any }> } */ result) => {
					if (result.length === 0) {
						throw new Error('Could not find the model to execute');
					}
					const modelText = result[0].text;
					return db.transaction((tx) =>
						sbvrUtils
							.executeModel(tx, {
								apiRoot: 'data',
								modelText,
							})
							.then(() =>
								uiApi.patch({
									resource: 'textarea',
									passthrough: {
										tx,
										req: permissions.root,
									},
									options: {
										$filter: {
											name: 'model_area',
										},
									},
									body: {
										is_disabled: true,
									},
								}),
							),
					);
				})
				.then(() => {
					isServerOnAir(true);
					res.sendStatus(200);
				})
				.catch((err) => {
					isServerOnAir(false);
					res.status(404).json(err);
				});
		},
	);
	app.post(
		'/validate',
		permissions.checkPermissionsMiddleware('get'),
		(req, res) => {
			sbvrUtils
				.runRule('data', req.body.rule)
				.then((results) => {
					res.json(results);
				})
				.catch((err) => {
					console.log('Error validating', err);
					res.sendStatus(404);
				});
		},
	);
	app.delete(
		'/cleardb',
		permissions.checkPermissionsMiddleware('delete'),
		(_req, res) => {
			db.transaction((tx) =>
				tx
					.tableList()
					.then((result) =>
						Bluebird.map(result.rows, (table) => tx.dropTable(table.name)),
					)
					.then(() => sbvrUtils.executeStandardModels(tx))
					.then(() => {
						// TODO: HACK: This is usually done by config-loader and should be done there
						// In general cleardb is very destructive and should really go through a full "reboot" procedure to set everything up again.
						console.warn(
							'DEL /cleardb is very destructive and should really be followed by a full restart/reload.',
						);
						return sbvrUtils.executeModels(tx, exports.config.models);
					})
					.then(() => setupModels(tx)),
			)
				.then(() => {
					res.sendStatus(200);
				})
				.catch((err) => {
					console.error('Error clearing db', err, err.stack);
					res.sendStatus(503);
				});
		},
	);
	app.put(
		'/importdb',
		permissions.checkPermissionsMiddleware('set'),
		(req, res) => {
			const queries = req.body.split(';');
			return db
				.transaction((tx) =>
					Bluebird.each(queries, (query) => {
						query = query.trim();
						if (query.length > 0) {
							return tx.executeSql(query).catch((err) => {
								throw [query, err];
							});
						}
					}),
				)
				.then(() => {
					res.sendStatus(200);
				})
				.catch((err) => {
					console.error('Error importing db', err, err.stack);
					res.sendStatus(404);
				});
		},
	);
	app.get(
		'/exportdb',
		permissions.checkPermissionsMiddleware('get'),
		(_req, res) => {
			db.transaction((tx) =>
				tx.tableList("name NOT LIKE '%_buk'").then((tables) => {
					let exported = '';
					return Bluebird.map(tables.rows, (table) => {
						const tableName = table.name;
						exported += 'DROP TABLE IF EXISTS "' + tableName + '";\n';
						exported += table.sql + ';\n';
						return tx
							.executeSql('SELECT * FROM "' + tableName + '";')
							.then((result) => {
								let insQuery = '';
								result.rows.forEach((currRow) => {
									let notFirst = false;
									insQuery += 'INSERT INTO "' + tableName + '" (';
									let valQuery = '';
									for (let propName of Object.keys(currRow || {})) {
										if (notFirst) {
											insQuery += ',';
											valQuery += ',';
										} else {
											notFirst = true;
										}
										insQuery += '"' + propName + '"';
										valQuery += "'" + currRow[propName] + "'";
									}
									insQuery += ') values (' + valQuery + ');\n';
								});
								exported += insQuery;
							});
					}).return(exported);
				}),
			)
				.then((exported) => {
					res.json(exported);
				})
				.catch((err) => {
					console.error('Error exporting db', err, err.stack);
					res.sendStatus(503);
				});
		},
	);
	app.post(
		'/backupdb',
		permissions.checkPermissionsMiddleware('all'),
		serverIsOnAir,
		(_req, res) => {
			db.transaction((tx) =>
				tx.tableList("name NOT LIKE '%_buk'").then((result) =>
					Bluebird.map(result.rows, (currRow) => {
						const tableName = currRow.name;
						return tx
							.dropTable(tableName + '_buk', true)
							.then(() =>
								tx.executeSql(
									'ALTER TABLE "' +
										tableName +
										'" RENAME TO "' +
										tableName +
										'_buk";',
								),
							);
					}),
				),
			)
				.then(() => res.sendStatus(200))
				.catch((err) => {
					console.error('Error backing up db', err, err.stack);
					res.sendStatus(404);
				});
		},
	);
	app.post(
		'/restoredb',
		permissions.checkPermissionsMiddleware('all'),
		serverIsOnAir,
		(_req, res) => {
			db.transaction((tx) =>
				tx.tableList("name LIKE '%_buk'").then((result) =>
					Bluebird.map(result.rows, (currRow) => {
						const tableName = currRow.name;
						return tx
							.dropTable(tableName.slice(0, -4), true)
							.then(() =>
								tx.executeSql(
									'ALTER TABLE "' +
										tableName +
										'" RENAME TO "' +
										tableName.slice(0, -4) +
										'";',
								),
							);
					}),
				),
			)
				.then(() => {
					res.sendStatus(200);
				})
				.catch((err) => {
					console.error('Error restoring db', err, err.stack);
					res.sendStatus(404);
				});
		},
	);

	app.all('/data/*', serverIsOnAir, sbvrUtils.handleODataRequest);
	app.get('/Auth/*', serverIsOnAir, sbvrUtils.handleODataRequest);
	app.merge('/ui/*', sbvrUtils.handleODataRequest);
	app.patch('/ui/*', sbvrUtils.handleODataRequest);

	app.delete('/', serverIsOnAir, (_req, res) => {
		Bluebird.all([
			uiApi.patch({
				resource: 'textarea',
				passthrough: { req: permissions.root },
				options: {
					$filter: {
						name: 'model_area',
					},
				},
				body: {
					text: '',
					name: 'model_area',
					is_disabled: false,
				},
			}),
			sbvrUtils.deleteModel('data'),
		]).then(() => {
			isServerOnAir(false);
			res.sendStatus(200);
		});
	});

	return db.transaction(setupModels);
}

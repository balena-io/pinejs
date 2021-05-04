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
	let promise = new Promise(($resolve) => {
		resolve = $resolve;
	});
	return (/** @type {boolean} */ value) => {
		if (value != null) {
			if (resolve != null) {
				resolve(value);
				resolve = undefined;
			} else {
				promise = Promise.resolve(value);
			}
		}
		return promise;
	};
})();

/** @type { import('express').Handler } */
const serverIsOnAir = async (_req, _res, next) => {
	const onAir = await isServerOnAir();
	if (onAir) {
		next();
	} else {
		next('route');
	}
};

/** @type {import('../config-loader/config-loader').Config} */
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
				'15.0.0-true-boolean': async (tx) => {
					switch (tx.engine) {
						case 'mysql':
							await tx.executeSql(`\
								ALTER TABLE "textarea"
								MODIFY "is disabled" BOOLEAN NOT NULL;`);
							break;
						case 'postgres':
							await tx.executeSql(`\
								ALTER TABLE "textarea"
								ALTER COLUMN "is disabled" SET DATA TYPE BOOLEAN USING b::BOOLEAN;`);
							break;
						// No need to migrate for websql
					}
				},
			},
		},
	],
};

/** @type { import('../config-loader/config-loader').SetupFunction } */
export async function setup(app, sbvrUtils, db) {
	const uiApi = sbvrUtils.api.ui;
	const devApi = sbvrUtils.api.dev;
	const setupModels = async (
		/** @type { import('../database-layer/db').Tx } */ tx,
	) => {
		try {
			const uiApiTx = uiApi.clone({
				passthrough: {
					tx,
					req: permissions.root,
				},
			});
			await uiApiTx
				.get({
					resource: 'textarea',
					id: {
						name: 'model_area',
					},
					options: {
						$select: 'id',
					},
				})
				.then(async (/** @type { { [key: string]: any } } */ result) => {
					if (result == null) {
						// Add a model_area entry if it doesn't already exist.
						return await uiApiTx.post({
							resource: 'textarea',
							body: {
								name: 'model_area',
								text: ' ',
							},
						});
					}
				});
			await devApi
				.get({
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
				})
				.then(async (/** @type { Array<{ [key: string]: any }> } */ result) => {
					if (result.length === 0) {
						throw new Error('No SE data model found');
					}
					const instance = result[0];
					await sbvrUtils.executeModel(tx, {
						apiRoot: instance.is_of__vocabulary,
						modelText: instance.model_value,
					});
				});
			await isServerOnAir(true);
		} catch {
			await isServerOnAir(false);
		}
	};

	app.get('/onAir', async (_req, res) => {
		const onAir = await isServerOnAir();
		res.json(onAir);
	});

	app.post(
		'/update',
		permissions.checkPermissionsMiddleware('all'),
		serverIsOnAir,
		(_req, res) => {
			res.status(404).end();
		},
	);

	app.post(
		'/execute',
		permissions.checkPermissionsMiddleware('all'),
		async (_req, res) => {
			try {
				await uiApi
					.get({
						resource: 'textarea',
						passthrough: { req: permissions.rootRead },
						id: {
							name: 'model_area',
						},
						options: {
							$select: 'text',
						},
					})
					.then(async (/** @type { { [key: string]: any } } */ result) => {
						if (result == null) {
							throw new Error('Could not find the model to execute');
						}
						const modelText = result.text;
						await db.transaction(async (tx) => {
							await sbvrUtils.executeModel(tx, {
								apiRoot: 'data',
								modelText,
							});
							await uiApi.patch({
								resource: 'textarea',
								passthrough: {
									tx,
									req: permissions.root,
								},
								id: {
									name: 'model_area',
								},
								body: {
									is_disabled: true,
								},
							});
						});
					});
				await isServerOnAir(true);
				res.status(200).end();
			} catch (err) {
				await isServerOnAir(false);
				res.status(404).json(err);
			}
		},
	);
	app.post(
		'/validate',
		permissions.checkPermissionsMiddleware('read'),
		async (req, res) => {
			try {
				const results = await sbvrUtils.runRule('data', req.body.rule);
				res.json(results);
			} catch (err) {
				console.log('Error validating', err);
				res.status(404).end();
			}
		},
	);
	app.delete(
		'/cleardb',
		permissions.checkPermissionsMiddleware('delete'),
		async (_req, res) => {
			try {
				await db.transaction(async (tx) => {
					const result = await tx.tableList();

					await Promise.all(
						result.rows.map((table) => tx.dropTable(table.name)),
					);
					await sbvrUtils.executeStandardModels(tx);
					// TODO: HACK: This is usually done by config-loader and should be done there
					// In general cleardb is very destructive and should really go through a full "reboot" procedure to set everything up again.
					console.warn(
						'DEL /cleardb is very destructive and should really be followed by a full restart/reload.',
					);
					await sbvrUtils.executeModels(tx, exports.config.models);
					await setupModels(tx);
				});
				res.status(200).end();
			} catch (/** @type any */ err) {
				console.error('Error clearing db', err, err.stack);
				res.status(503).end();
			}
		},
	);
	app.put(
		'/importdb',
		permissions.checkPermissionsMiddleware({
			and: ['create', 'update', 'delete'],
		}),
		async (req, res) => {
			try {
				const queries = req.body.split(';');
				await db.transaction(async (tx) => {
					for (let query of queries) {
						query = query.trim();
						if (query.length > 0) {
							try {
								await tx.executeSql(query);
							} catch (err) {
								throw [query, err];
							}
						}
					}
				});
				res.status(200).end();
			} catch (/** @type any */ err) {
				console.error('Error importing db', err, err.stack);
				res.status(404).end();
			}
		},
	);
	app.get(
		'/exportdb',
		permissions.checkPermissionsMiddleware('read'),
		async (_req, res) => {
			try {
				let exported = '';
				await db.transaction(async (tx) => {
					const tables = await tx.tableList("name NOT LIKE '%_buk'");
					await Promise.all(
						tables.rows.map(async (table) => {
							const tableName = table.name;
							exported += 'DROP TABLE IF EXISTS "' + tableName + '";\n';
							exported += table.sql + ';\n';
							const result = await tx.executeSql(
								'SELECT * FROM "' + tableName + '";',
							);
							let insQuery = '';
							for (const currRow of result.rows) {
								let notFirst = false;
								insQuery += 'INSERT INTO "' + tableName + '" (';
								let valQuery = '';
								for (const propName of Object.keys(currRow)) {
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
							}
							exported += insQuery;
						}),
					);
				});
				res.json(exported);
			} catch (/** @type any */ err) {
				console.error('Error exporting db', err, err.stack);
				res.status(503).end();
			}
		},
	);
	app.post(
		'/backupdb',
		permissions.checkPermissionsMiddleware('all'),
		serverIsOnAir,
		async (_req, res) => {
			try {
				await db.transaction(async (tx) => {
					const result = await tx.tableList("name NOT LIKE '%_buk'");
					await Promise.all(
						result.rows.map(async (currRow) => {
							const tableName = currRow.name;
							await tx.dropTable(tableName + '_buk', true);

							await tx.executeSql(
								'ALTER TABLE "' +
									tableName +
									'" RENAME TO "' +
									tableName +
									'_buk";',
							);
						}),
					);
				});
				res.status(200).end();
			} catch (/** @type any */ err) {
				console.error('Error backing up db', err, err.stack);
				res.status(404).end();
			}
		},
	);
	app.post(
		'/restoredb',
		permissions.checkPermissionsMiddleware('all'),
		serverIsOnAir,
		async (_req, res) => {
			try {
				await db.transaction(async (tx) => {
					const result = await tx.tableList("name LIKE '%_buk'");
					await Promise.all(
						result.rows.map(async (currRow) => {
							const tableName = currRow.name;
							await tx.dropTable(tableName.slice(0, -4), true);
							await tx.executeSql(
								'ALTER TABLE "' +
									tableName +
									'" RENAME TO "' +
									tableName.slice(0, -4) +
									'";',
							);
						}),
					);
				});
				res.status(200).end();
			} catch (/** @type any */ err) {
				console.error('Error restoring db', err, err.stack);
				res.status(404).end();
			}
		},
	);

	app.all('/data/*', serverIsOnAir, sbvrUtils.handleODataRequest);
	app.get('/Auth/*', serverIsOnAir, sbvrUtils.handleODataRequest);
	app.merge('/ui/*', sbvrUtils.handleODataRequest);
	app.patch('/ui/*', sbvrUtils.handleODataRequest);

	app.delete('/', serverIsOnAir, async (_req, res) => {
		await Promise.all([
			uiApi.patch({
				resource: 'textarea',
				passthrough: { req: permissions.root },
				id: {
					name: 'model_area',
				},
				body: {
					text: '',
					is_disabled: false,
				},
			}),
			sbvrUtils.deleteModel('data'),
		]);
		await isServerOnAir(false);
		res.status(200).end();
	});

	await db.transaction(setupModels);
}

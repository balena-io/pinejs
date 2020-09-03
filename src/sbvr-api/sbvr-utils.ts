import type * as Express from 'express';
import type * as Db from '../database-layer/db';
import type { Model } from '../config-loader/config-loader';
import type { AnyObject, RequiredField } from './common-types';

declare global {
	namespace Express {
		export interface Request {
			tx?: Db.Tx;
			batch?: uriParser.UnparsedRequest[];
		}
	}
}

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';

import { TypedError } from 'typed-error';
import { cachedCompile } from './cached-compile';

type LFModel = any[];
import * as AbstractSQLCompiler from '@balena/abstract-sql-compiler';
import { version as AbstractSQLCompilerVersion } from '@balena/abstract-sql-compiler/package.json';
import * as LF2AbstractSQL from '@balena/lf-to-abstract-sql';

import {
	odataNameToSqlName,
	sqlNameToODataName,
	SupportedMethod,
} from '@balena/odata-to-abstract-sql';
import * as sbvrTypes from '@balena/sbvr-types';
import deepFreeze = require('deep-freeze');
import { PinejsClientCore, PromiseResultTypes } from 'pinejs-client-core';

import { ExtendedSBVRParser } from '../extended-sbvr-parser/extended-sbvr-parser';

import * as migrator from '../migrator/migrator';
import { generateODataMetadata } from '../odata-metadata/odata-metadata-generator';

// tslint:disable-next-line:no-var-requires
const devModel = require('./dev.sbvr');
import * as permissions from './permissions';
import {
	BadRequestError,
	ConflictError,
	HttpError,
	InternalRequestError,
	MethodNotAllowedError,
	NotFoundError,
	ParsingError,
	PermissionError,
	PermissionParsingError,
	SbvrValidationError,
	SqlCompilationError,
	statusCodeToError,
	TranslationError,
	UnauthorizedError,
} from './errors';
import * as uriParser from './uri-parser';
import {
	HookReq,
	HookArgs,
	rollbackRequestHooks,
	getHooks,
	runHooks,
	InstantiatedHooks,
} from './hooks';
export {
	HookReq,
	HookArgs,
	HookResponse,
	Hooks,
	addPureHook,
	addSideEffectHook,
} from './hooks';
// TODO-MAJOR: Remove
export type HookRequest = uriParser.ODataRequest;

import memoizeWeak = require('memoizee/weak');
import * as controlFlow from './control-flow';

const { DEBUG } = process.env;

export let db = (undefined as any) as Db.Database;

export { sbvrTypes };

import { version as LF2AbstractSQLVersion } from '@balena/lf-to-abstract-sql/package.json';
import { version as sbvrTypesVersion } from '@balena/sbvr-types/package.json';
import {
	compileRequest,
	getAndCheckBindValues,
	isRuleAffected,
} from './abstract-sql';
export { resolveOdataBind } from './abstract-sql';
import * as odataResponse from './odata-response';

const LF2AbstractSQLTranslator = LF2AbstractSQL.createTranslator(sbvrTypes);
const LF2AbstractSQLTranslatorVersion = `${LF2AbstractSQLVersion}+${sbvrTypesVersion}`;

export type ExecutableModel =
	| RequiredField<Model, 'apiRoot' | 'modelText'>
	| RequiredField<Model, 'apiRoot' | 'abstractSql'>;

interface CompiledModel {
	vocab: string;
	se?: string;
	lf?: LFModel;
	abstractSql: AbstractSQLCompiler.AbstractSqlModel;
	sql: AbstractSQLCompiler.SqlModel;
	odataMetadata: ReturnType<typeof generateODataMetadata>;
}
const models: {
	[vocabulary: string]: CompiledModel;
} = {};

export interface Actor {
	permissions?: string[];
}

export interface User extends Actor {
	id: number;
	actor: number;
}

export interface ApiKey extends Actor {
	key: string;
	actor?: number;
}

interface Response {
	status?: number;
	headers?: {
		[headerName: string]: any;
	};
	body?: AnyObject | string;
}

const memoizedResolvedSynonym = memoizeWeak(
	(
		abstractSqlModel: AbstractSQLCompiler.AbstractSqlModel,
		resourceName: string,
	): string => {
		const sqlName = odataNameToSqlName(resourceName);
		return _(sqlName)
			.split('-')
			.map((namePart) => {
				const synonym = abstractSqlModel.synonyms[namePart];
				if (synonym != null) {
					return synonym;
				}
				return namePart;
			})
			.join('-');
	},
	{ primitive: true },
);

export const resolveSynonym = (
	request: Pick<
		uriParser.ODataRequest,
		'abstractSqlModel' | 'resourceName' | 'vocabulary'
	>,
): string => {
	const abstractSqlModel = getAbstractSqlModel(request);
	return memoizedResolvedSynonym(abstractSqlModel, request.resourceName);
};

const memoizedResolveNavigationResource = memoizeWeak(
	(
		abstractSqlModel: AbstractSQLCompiler.AbstractSqlModel,
		resourceName: string,
		navigationName: string,
	): string => {
		const navigation = _(odataNameToSqlName(navigationName))
			.split('-')
			.flatMap((namePart) =>
				memoizedResolvedSynonym(abstractSqlModel, namePart).split('-'),
			)
			.concat('$')
			.value();
		const resolvedResourceName = memoizedResolvedSynonym(
			abstractSqlModel,
			resourceName,
		);
		const mapping = _.get(
			abstractSqlModel.relationships[resolvedResourceName],
			navigation,
		) as undefined | AbstractSQLCompiler.RelationshipMapping;
		if (mapping == null) {
			throw new Error(
				`Cannot navigate from '${resourceName}' to '${navigationName}'`,
			);
		}
		if (mapping.length < 2) {
			throw new Error(
				`'${resourceName}' to '${navigationName}' is a field not a navigation`,
			);
		}
		// we do check the length above, but typescript thinks the second
		// element could be undefined
		return sqlNameToODataName(abstractSqlModel.tables[mapping[1]![0]].name);
	},
	{ primitive: true },
);
export const resolveNavigationResource = (
	request: Pick<
		uriParser.ODataRequest,
		'resourceName' | 'vocabulary' | 'abstractSqlModel'
	>,
	navigationName: string,
): string => {
	const abstractSqlModel = getAbstractSqlModel(request);
	return memoizedResolveNavigationResource(
		abstractSqlModel,
		request.resourceName,
		navigationName,
	);
};

// TODO: Clean this up and move it into the db module.
const prettifyConstraintError = (
	err: Error | TypedError,
	request: uriParser.ODataRequest,
) => {
	if (err instanceof db.ConstraintError) {
		let matches: RegExpExecArray | null = null;
		if (err instanceof db.UniqueConstraintError) {
			switch (db.engine) {
				case 'mysql':
					matches = /ER_DUP_ENTRY: Duplicate entry '.*?[^\\]' for key '(.*?[^\\])'/.exec(
						err.message,
					);
					break;
				case 'postgres':
					const resourceName = resolveSynonym(request);
					const abstractSqlModel = getAbstractSqlModel(request);
					matches = new RegExp(
						'"' + abstractSqlModel.tables[resourceName].name + '_(.*?)_key"',
					).exec(err.message);
					break;
			}
			// We know it's the right error type, so if matches exists just throw a generic error message, since we have failed to get the info for a more specific one.
			if (matches == null) {
				throw new db.UniqueConstraintError('Unique key constraint violated');
			}
			const columns = matches[1].split('_');
			throw new db.UniqueConstraintError(
				'"' +
					columns.map(sqlNameToODataName).join('" and "') +
					'" must be unique.',
			);
		}

		if (err instanceof db.ForeignKeyConstraintError) {
			switch (db.engine) {
				case 'mysql':
					matches = /ER_ROW_IS_REFERENCED_: Cannot delete or update a parent row: a foreign key constraint fails \(".*?"\.(".*?").*/.exec(
						err.message,
					);
					break;
				case 'postgres':
					const resourceName = resolveSynonym(request);
					const abstractSqlModel = getAbstractSqlModel(request);
					const tableName = abstractSqlModel.tables[resourceName].name;
					matches = new RegExp(
						'"' +
							tableName +
							'" violates foreign key constraint ".*?" on table "(.*?)"',
					).exec(err.message);
					if (matches == null) {
						matches = new RegExp(
							'"' +
								tableName +
								'" violates foreign key constraint "' +
								tableName +
								'_(.*?)_fkey"',
						).exec(err.message);
					}
					break;
			}
			// We know it's the right error type, so if no matches exists just throw a generic error message,
			// since we have failed to get the info for a more specific one.
			if (matches == null) {
				throw new db.ForeignKeyConstraintError(
					'Foreign key constraint violated',
				);
			}
			throw new db.ForeignKeyConstraintError(
				'Data is referenced by ' + sqlNameToODataName(matches[1]) + '.',
			);
		}

		throw err;
	}
};

export const validateModel = async (
	tx: Db.Tx,
	modelName: string,
	request?: uriParser.ODataRequest,
): Promise<void> => {
	await Promise.all(
		models[modelName].sql.rules.map(async (rule) => {
			if (!isRuleAffected(rule, request)) {
				// If none of the fields intersect we don't need to run the rule! :D
				return;
			}

			const values = await getAndCheckBindValues(
				{
					vocabulary: modelName,
					odataBinds: [],
					values: {},
					engine: db.engine,
				},
				rule.bindings,
			);
			const result = await tx.executeSql(rule.sql, values);

			const v = result.rows[0].result;
			if (v === false || v === 0 || v === '0') {
				throw new SbvrValidationError(rule.structuredEnglish);
			}
		}),
	);
};

export const generateLfModel = (seModel: string): LFModel =>
	cachedCompile('lfModel', ExtendedSBVRParser.version, seModel, () =>
		ExtendedSBVRParser.matchAll(seModel, 'Process'),
	);

export const generateAbstractSqlModel = (
	lfModel: LFModel,
): AbstractSQLCompiler.AbstractSqlModel =>
	cachedCompile(
		'abstractSqlModel',
		LF2AbstractSQLTranslatorVersion,
		lfModel,
		() => LF2AbstractSQLTranslator(lfModel, 'Process'),
	);

export const generateModels = (
	model: ExecutableModel,
	targetDatabaseEngine: AbstractSQLCompiler.Engines,
): CompiledModel => {
	const { apiRoot: vocab, modelText: se } = model;
	let { abstractSql: maybeAbstractSql } = model;

	let lf: ReturnType<typeof generateLfModel> | undefined;
	if (se) {
		try {
			lf = generateLfModel(se);
		} catch (e) {
			console.error(`Error parsing model '${vocab}':`, e);
			throw new Error(`Error parsing model '${vocab}': ` + e);
		}

		try {
			maybeAbstractSql = generateAbstractSqlModel(lf);
		} catch (e) {
			console.error(`Error translating model '${vocab}':`, e);
			throw new Error(`Error translating model '${vocab}': ` + e);
		}
	}
	const abstractSql = maybeAbstractSql!;

	const odataMetadata = cachedCompile(
		'metadata',
		generateODataMetadata.version,
		{ vocab, abstractSqlModel: abstractSql },
		() => generateODataMetadata(vocab, abstractSql),
	);

	let sql: ReturnType<AbstractSQLCompiler.EngineInstance['compileSchema']>;
	try {
		sql = cachedCompile(
			'sqlModel',
			AbstractSQLCompilerVersion + '+' + targetDatabaseEngine,
			abstractSql,
			() =>
				AbstractSQLCompiler[targetDatabaseEngine].compileSchema(abstractSql),
		);
	} catch (e) {
		console.error(`Error compiling model '${vocab}':`, e);
		throw new Error(`Error compiling model '${vocab}': ` + e);
	}

	return { vocab, se, lf, abstractSql, sql, odataMetadata };
};

export const executeModel = (
	tx: Db.Tx,
	model: ExecutableModel,
): Promise<void> => executeModels(tx, [model]);

export const executeModels = async (
	tx: Db.Tx,
	execModels: ExecutableModel[],
): Promise<void> => {
	try {
		const compiledModels = await Promise.all(
			execModels.map(async (model) => {
				const { apiRoot } = model;

				await migrator.run(tx, model);
				const compiledModel = generateModels(model, db.engine);

				// Create tables related to terms and fact types
				// Run statements sequentially, as the order of the CREATE TABLE statements matters (eg. for foreign keys).
				for (const createStatement of compiledModel.sql.createSchema) {
					const promise = tx.executeSql(createStatement);
					if (db.engine === 'websql') {
						promise.catch((err) => {
							console.warn(
								"Ignoring errors in the create table statements for websql as it doesn't support CREATE IF NOT EXISTS",
								err,
							);
						});
					}
					await promise;
				}
				await migrator.postRun(tx, model);

				odataResponse.prepareModel(compiledModel.abstractSql);
				deepFreeze(compiledModel.abstractSql);
				models[apiRoot] = compiledModel;

				// Validate the [empty] model according to the rules.
				// This may eventually lead to entering obligatory data.
				// For the moment it blocks such models from execution.
				await validateModel(tx, apiRoot);

				// TODO: Can we do this without the cast?
				api[apiRoot] = new PinejsClient('/' + apiRoot + '/') as LoggingClient;
				api[apiRoot].logger = _.cloneDeep(console);
				if (model.logging != null) {
					const defaultSetting = model.logging?.default ?? true;
					for (const k of Object.keys(model.logging)) {
						const key = k as keyof Console;
						if (
							typeof api[apiRoot].logger[key] === 'function' &&
							!(model.logging?.[key] ?? defaultSetting)
						) {
							api[apiRoot].logger[key] = _.noop;
						}
					}
				}
				return compiledModel;
				// Only update the dev models once all models have finished executing.
			}),
		);
		await Promise.all(
			compiledModels.map(async (model: CompiledModel) => {
				const updateModel = async (modelType: keyof CompiledModel) => {
					if (model[modelType] == null) {
						return await api.dev.delete({
							resource: 'model',
							passthrough: {
								tx,
								req: permissions.root,
							},
							options: {
								$filter: {
									is_of__vocabulary: model.vocab,
									model_type: modelType,
								},
							},
						});
					}
					const result = (await api.dev.get({
						resource: 'model',
						passthrough: {
							tx,
							req: permissions.rootRead,
						},
						options: {
							$select: 'id',
							$filter: {
								is_of__vocabulary: model.vocab,
								model_type: modelType,
							},
						},
					})) as Array<{ id: number }>;

					let method: SupportedMethod = 'POST';
					let uri = '/dev/model';
					const body: AnyObject = {
						is_of__vocabulary: model.vocab,
						model_value: model[modelType],
						model_type: modelType,
					};
					const id = result?.[0]?.id;
					if (id != null) {
						uri += '(' + id + ')';
						method = 'PATCH';
						body.id = id;
					} else {
						uri += '?returnResource=false';
					}

					return await runURI(method, uri, body, tx, permissions.root);
				};

				await Promise.all(
					['se', 'lf', 'abstractSql', 'sql', 'odataMetadata'].map(updateModel),
				);
			}),
		);
	} catch (err) {
		await Promise.all(
			execModels.map(async ({ apiRoot }) => {
				await cleanupModel(apiRoot);
			}),
		);
		throw err;
	}
};

const cleanupModel = (vocab: string) => {
	delete models[vocab];
	delete api[vocab];
};

export const deleteModel = async (vocabulary: string) => {
	await db.transaction(async (tx) => {
		const dropStatements: Array<Promise<any>> = models[
			vocabulary
		].sql.dropSchema.map((dropStatement) => tx.executeSql(dropStatement));
		await Promise.all(
			dropStatements.concat([
				api.dev.delete({
					resource: 'model',
					passthrough: {
						tx,
						req: permissions.root,
					},
					options: {
						$filter: {
							is_of__vocabulary: vocabulary,
						},
					},
				}),
			]),
		);
	});
	await cleanupModel(vocabulary);
};

const isWhereNode = (
	x: AbstractSQLCompiler.AbstractSqlType,
): x is AbstractSQLCompiler.WhereNode => x[0] === 'Where';
const isEqualsNode = (
	x: AbstractSQLCompiler.AbstractSqlType,
): x is AbstractSQLCompiler.EqualsNode => x[0] === 'Equals';
export const getID = (vocab: string, request: uriParser.ODataRequest) => {
	if (request.abstractSqlQuery == null) {
		throw new Error('Can only get the id if an abstractSqlQuery is provided');
	}
	const { idField } = models[vocab].abstractSql.tables[request.resourceName];
	for (const whereClause of request.abstractSqlQuery) {
		if (isWhereNode(whereClause)) {
			for (const comparison of whereClause.slice(1)) {
				if (isEqualsNode(comparison)) {
					if (comparison[1][2] === idField) {
						return comparison[2][1];
					}
					if (comparison[2][2] === idField) {
						return comparison[1][1];
					}
				}
			}
		}
	}
	return 0;
};

export const runRule = (() => {
	const LF2AbstractSQLPrepHack = LF2AbstractSQL.LF2AbstractSQLPrep._extend({
		CardinalityOptimisation() {
			this._pred(false);
		},
	});
	const translator = LF2AbstractSQL.LF2AbstractSQL.createInstance();
	translator.addTypes(sbvrTypes);
	return async (vocab: string, rule: string) => {
		const seModel = models[vocab].se;
		const { logger } = api[vocab];
		let lfModel: LFModel;
		let slfModel: LFModel;
		let abstractSqlModel: AbstractSQLCompiler.AbstractSqlModel;

		try {
			lfModel = ExtendedSBVRParser.matchAll(
				seModel + '\nRule: ' + rule,
				'Process',
			);
		} catch (e) {
			logger.error('Error parsing rule', rule, e);
			throw new Error(`Error parsing rule'${rule}': ${e}`);
		}

		const ruleLF = lfModel.pop();

		try {
			slfModel = LF2AbstractSQL.LF2AbstractSQLPrep.match(lfModel, 'Process');
			slfModel.push(ruleLF);
			slfModel = LF2AbstractSQLPrepHack.match(slfModel, 'Process');

			translator.reset();
			abstractSqlModel = translator.match(slfModel, 'Process');
		} catch (e) {
			logger.error('Error compiling rule', rule, e);
			throw new Error(`Error compiling rule '${rule}': ${e}`);
		}

		const formulationType = ruleLF[1][0];
		let resourceName: string;
		if (ruleLF[1][1][0] === 'LogicalNegation') {
			resourceName = ruleLF[1][1][1][1][2][1];
		} else {
			resourceName = ruleLF[1][1][1][2][1];
		}

		let fetchingViolators = false;
		const ruleAbs = _.last(abstractSqlModel.rules);
		if (ruleAbs == null) {
			throw new Error('Unable to generate rule');
		}
		const ruleBody = ruleAbs.find((node) => node[0] === 'Body') as [
			'Body',
			...any[]
		];
		if (
			ruleBody[1][0] === 'Not' &&
			ruleBody[1][1][0] === 'Exists' &&
			ruleBody[1][1][1][0] === 'SelectQuery'
		) {
			// Remove the not exists
			ruleBody[1] = ruleBody[1][1][1];
			fetchingViolators = true;
		} else if (
			ruleBody[1][0] === 'Exists' &&
			ruleBody[1][1][0] === 'SelectQuery'
		) {
			// Remove the exists
			ruleBody[1] = ruleBody[1][1];
		} else {
			throw new Error('Unsupported rule formulation');
		}

		const wantNonViolators =
			formulationType in
			['PossibilityFormulation', 'PermissibilityFormulation'];
		if (wantNonViolators === fetchingViolators) {
			// What we want is the opposite of what we're getting, so add a not to the where clauses
			ruleBody[1] = ruleBody[1].map(
				(queryPart: AbstractSQLCompiler.AbstractSqlQuery) => {
					if (queryPart[0] !== 'Where') {
						return queryPart;
					}
					if (queryPart.length > 2) {
						throw new Error('Unsupported rule formulation');
					}
					return ['Where', ['Not', queryPart[1]]];
				},
			);
		}

		// Select all
		ruleBody[1] = ruleBody[1].map(
			(queryPart: AbstractSQLCompiler.AbstractSqlQuery) => {
				if (queryPart[0] !== 'Select') {
					return queryPart;
				}
				return ['Select', '*'];
			},
		);
		const compiledRule = AbstractSQLCompiler[db.engine].compileRule(ruleBody);
		if (Array.isArray(compiledRule)) {
			throw new Error('Unexpected query generated');
		}
		const values = await getAndCheckBindValues(
			{
				vocabulary: vocab,
				odataBinds: [],
				values: {},
				engine: db.engine,
			},
			compiledRule.bindings,
		);
		const result = await db.executeSql(compiledRule.query, values);

		const table = models[vocab].abstractSql.tables[resourceName];
		const odataIdField = sqlNameToODataName(table.idField);
		let ids = result.rows.map((row) => row[table.idField]);
		ids = _.uniq(ids);
		ids = ids.map((id) => odataIdField + ' eq ' + id);
		let filter: string;
		if (ids.length > 0) {
			filter = ids.join(' or ');
		} else {
			filter = '0 eq 1';
		}
		const odataResult = (await runURI(
			'GET',
			'/' +
				vocab +
				'/' +
				sqlNameToODataName(table.resourceName) +
				'?$filter=' +
				filter,
			undefined,
			undefined,
			permissions.rootRead,
		)) as AnyObject;

		odataResult.__formulationType = formulationType;
		odataResult.__resourceName = resourceName;
		return odataResult;
	};
})();

export type Passthrough = AnyObject & {
	req?: {
		user?: User;
	};
	tx?: Db.Tx;
};

export class PinejsClient extends PinejsClientCore<PinejsClient> {
	public passthrough: Passthrough;
	public async _request({
		method,
		url,
		body,
		tx,
		req,
		custom,
	}: {
		method: string;
		url: string;
		body?: AnyObject;
		tx?: Db.Tx;
		req?: permissions.PermissionReq;
		custom?: AnyObject;
	}) {
		return (await runURI(method, url, body, tx, req, custom)) as {};
	}
}

export type LoggingClient = PinejsClient & {
	logger: Console;
};
export const api: {
	[vocab: string]: LoggingClient;
} = {};

// We default to guest only permissions if no req object is passed in
export const runURI = async (
	method: string,
	uri: string,
	body: AnyObject = {},
	tx?: Db.Tx,
	req?: permissions.PermissionReq,
	custom?: AnyObject,
): Promise<PromiseResultTypes> => {
	const [, apiRoot] = uri.split('/', 2);
	if (apiRoot == null || models[apiRoot] == null) {
		throw new InternalRequestError();
	}

	let user: User | undefined;
	let apiKey: ApiKey | undefined;

	if (req != null && _.isObject(req)) {
		user = req.user;
		apiKey = req.apiKey;
	} else {
		if (req != null) {
			console.warn('Non-object req passed to runURI?', req, new Error().stack);
		}
		user = {
			id: 0,
			actor: 0,
			permissions: [],
		};
	}

	// Remove undefined values from the body, as normally they would be removed by the JSON conversion
	_.forEach(body, (v, k) => {
		if (v === undefined) {
			delete body[k];
		}
	});

	const emulatedReq: Express.Request = {
		on: _.noop,
		custom,
		user,
		apiKey,
		method,
		url: uri,
		body,
		params: {},
		query: {},
		tx,
	} as any;

	return await new Promise<PromiseResultTypes>(async (resolve, reject) => {
		// TODO-MAJOR: Remove the emulated res object
		const res: Express.Response = {
			__internalPinejs: true,
			on: _.noop,
			statusCode: 200,
			status(statusCode: number) {
				this.statusCode = statusCode;
				return this;
			},
			sendStatus: (statusCode: number) => {
				if (statusCode >= 400) {
					const ErrorClass =
						statusCodeToError[statusCode as keyof typeof statusCodeToError];
					if (ErrorClass != null) {
						reject(new ErrorClass());
					} else {
						reject(new HttpError(statusCode));
					}
				} else {
					resolve();
				}
			},
			send(statusCode: number) {
				statusCode ??= this.statusCode;
				this.sendStatus(statusCode);
			},
			json(data: any, statusCode: number) {
				if (_.isError(data)) {
					reject(data);
					return;
				}
				statusCode ??= this.statusCode;
				if (statusCode >= 400) {
					const ErrorClass =
						statusCodeToError[statusCode as keyof typeof statusCodeToError];
					if (ErrorClass != null) {
						reject(new ErrorClass(data));
					} else {
						reject(new HttpError(statusCode, data));
					}
				} else {
					resolve(data);
				}
			},
			set: _.noop,
			type: _.noop,
		} as any;

		try {
			const { promise } = runODataRequest(emulatedReq, res, apiRoot);

			const [response] = await promise;

			if (_.isError(response)) {
				throw response;
			}

			const { body: responseBody, status } = response as Response;

			if (status != null && status >= 400) {
				const ErrorClass =
					statusCodeToError[status as keyof typeof statusCodeToError];
				if (ErrorClass != null) {
					throw new ErrorClass(undefined, responseBody);
				}
				throw new HttpError(status, undefined, responseBody);
			}

			resolve(responseBody as AnyObject | undefined);
		} catch (err) {
			reject(err);
		}
	});
};

export const getAbstractSqlModel = (
	request: Pick<uriParser.ODataRequest, 'vocabulary' | 'abstractSqlModel'>,
): AbstractSQLCompiler.AbstractSqlModel => {
	return (request.abstractSqlModel ??= models[request.vocabulary].abstractSql);
};

const getIdField = (
	request: Pick<
		uriParser.ODataRequest,
		'vocabulary' | 'abstractSqlModel' | 'resourceName'
	>,
) => getAbstractSqlModel(request).tables[resolveSynonym(request)].idField;

export const getAffectedIds = async (
	args: HookArgs & {
		tx: Db.Tx;
	},
): Promise<number[]> => {
	const { request } = args;
	if (request.affectedIds) {
		return request.affectedIds;
	}

	// We keep the affected ids promise so we only have to fetch them once per request
	if (request.pendingAffectedIds != null) {
		return request.pendingAffectedIds;
	}
	request.pendingAffectedIds = $getAffectedIds(args);

	// Keep the affected ids and let the promise to be GCed sooner.
	request.affectedIds = await request.pendingAffectedIds;
	delete request.pendingAffectedIds;

	return request.affectedIds;
};

const $getAffectedIds = async ({
	req,
	request,
	tx,
}: HookArgs & {
	tx: Db.Tx;
}): Promise<number[]> => {
	if (request.method === 'GET') {
		// GET requests don't affect anything so passing one to this method is a mistake
		throw new Error('Cannot call `getAffectedIds` with a GET request');
	}
	// We reparse to make sure we get a clean odataQuery, without permissions already added
	// And we use the request's url rather than the req for things like batch where the req url is ../$batch
	request = await uriParser.parseOData({
		method: request.method,
		url: `/${request.vocabulary}${request.url}`,
	});

	request.engine = db.engine;
	const abstractSqlModel = getAbstractSqlModel(request);
	const resourceName = resolveSynonym(request);
	const resourceTable = abstractSqlModel.tables[resourceName];
	if (resourceTable == null) {
		throw new Error('Unknown resource: ' + request.resourceName);
	}
	const { idField } = resourceTable;

	request.odataQuery.options ??= {};
	request.odataQuery.options.$select = {
		properties: [{ name: idField }],
	};

	// Delete any $expand that might exist as they're ignored on non-GETs but we're converting this request to a GET
	delete request.odataQuery.options.$expand;

	await permissions.addPermissions(req, request);

	request.method = 'GET';

	request = uriParser.translateUri(request);
	request = compileRequest(request);

	let result;
	if (tx != null) {
		result = await runQuery(tx, request);
	} else {
		result = await runTransaction(req, request, (newTx) =>
			runQuery(newTx, request),
		);
	}
	return result.rows.map((row) => row[idField]);
};

const runODataRequest = (
	req: Express.Request,
	res: Express.Response,
	vocabulary: string,
) => {
	if (DEBUG) {
		api[vocabulary].logger.log('Parsing', req.method, req.url);
	}

	// Get the hooks for the current method/vocabulary as we know it,
	// in order to run PREPARSE hooks, before parsing gets us more info
	const reqHooks = getHooks({
		method: req.method as SupportedMethod,
		vocabulary,
	});

	const transactions: Db.Tx[] = [];
	const tryCancelRequest = () => {
		transactions.forEach(async (tx) => {
			if (tx.isClosed()) {
				return;
			}
			try {
				await tx.rollback();
			} catch {
				// Ignore issues rolling back/cancelling transactions
			}
		});
		// Clear the list
		transactions.length = 0;
		rollbackRequestHooks(reqHooks);
	};

	req.on('close', tryCancelRequest);

	if (req.tx != null) {
		transactions.push(req.tx);
		req.tx.on('rollback', tryCancelRequest);
	}

	const mapSeries = controlFlow.getMappingFn(req.headers);

	return {
		tryCancelRequest,
		promise: (async () => {
			await runHooks('PREPARSE', reqHooks, { req, tx: req.tx });
			let requests: uriParser.UnparsedRequest[];
			// Check if it is a single request or a batch
			if (req.batch != null && req.batch.length > 0) {
				requests = req.batch;
			} else {
				const { method, url, body } = req;
				requests = [{ method, url, data: body }];
			}

			const prepareRequest = async ($request: uriParser.ODataRequest) => {
				$request.engine = db.engine;
				// Get the full hooks list now that we can.
				$request.hooks = getHooks($request);
				// Add/check the relevant permissions
				try {
					await runHooks('POSTPARSE', $request.hooks, {
						req,
						request: $request,
						tx: req.tx,
					});
					const translatedRequest = await uriParser.translateUri($request);
					return await compileRequest(translatedRequest);
				} catch (err) {
					rollbackRequestHooks(reqHooks);
					rollbackRequestHooks($request.hooks);
					throw err;
				}
			};

			// Parse the OData requests
			const results = await mapSeries(requests, async (requestPart) => {
				let request = await uriParser.parseOData(requestPart);

				if (Array.isArray(request)) {
					request = await Bluebird.mapSeries(request, prepareRequest);
				} else {
					request = await prepareRequest(request);
				}
				// Run the request in its own transaction
				return await runTransaction<Response | Response[]>(
					req,
					request,
					async (tx) => {
						transactions.push(tx);
						tx.on('rollback', () => {
							rollbackRequestHooks(reqHooks);
							if (Array.isArray(request)) {
								request.forEach(({ hooks }) => {
									rollbackRequestHooks(hooks);
								});
							} else {
								rollbackRequestHooks(request.hooks);
							}
						});
						if (Array.isArray(request)) {
							const env = await Bluebird.reduce(
								request,
								runChangeSet(req, res, tx),
								new Map<number, Response>(),
							);
							return Array.from(env.values());
						} else {
							return await runRequest(req, res, tx, request);
						}
					},
				);
			});

			const responses = results.map((result) => {
				if (_.isError(result)) {
					return convertToHttpError(result);
				} else {
					if (
						!Array.isArray(result) &&
						result.body == null &&
						result.status == null
					) {
						console.error('No status or body set', req.url, responses);
						return new InternalRequestError();
					}
					return result;
				}
			});
			return responses;
		})(),
	};
};

export const handleODataRequest: Express.Handler = async (req, res, next) => {
	const [, apiRoot] = req.url.split('/', 2);
	if (apiRoot == null || models[apiRoot] == null) {
		return next('route');
	}

	try {
		const { tryCancelRequest, promise } = runODataRequest(req, res, apiRoot);

		res.on('close', tryCancelRequest);

		const responses = await promise;

		res.set('Cache-Control', 'no-cache');
		// If we are dealing with a single request unpack the response and respond normally
		if (req.batch == null || req.batch.length === 0) {
			let [response] = responses;
			if (_.isError(response)) {
				response = {
					status: response.status,
					body: response.getResponseBody(),
				};
			}
			const { body, headers, status } = response as Response;
			if (status) {
				res.status(status);
			}
			_.forEach(headers, (headerValue, headerName) => {
				res.set(headerName, headerValue);
			});

			if (!body) {
				res.sendStatus(status!);
			} else {
				if (status != null) {
					res.status(status);
				}
				res.json(body);
			}

			// Otherwise its a multipart request and we reply with the appropriate multipart response
		} else {
			(res.status(200) as any).sendMulti(
				responses.map((response) => {
					if (_.isError(response)) {
						return {
							status: response.status,
							body: response.getResponseBody(),
						};
					} else {
						return response;
					}
				}),
			);
		}
	} catch (e) {
		// If an error bubbles here it must have happened in the last then block
		// We just respond with 500 as there is probably not much we can do to recover
		console.error('An error occurred while constructing the response', e);
		res.sendStatus(500);
	}
};

// Reject the error to use the nice catch syntax
const convertToHttpError = (err: any): HttpError => {
	if (err instanceof HttpError) {
		return err;
	}
	if (err instanceof SbvrValidationError) {
		return new BadRequestError(err);
	}
	if (err instanceof PermissionError) {
		return new UnauthorizedError(err);
	}
	if (err instanceof db.ConstraintError) {
		return new ConflictError(err);
	}
	if (
		err instanceof SqlCompilationError ||
		err instanceof TranslationError ||
		err instanceof ParsingError ||
		err instanceof PermissionParsingError ||
		err instanceof db.TransactionClosedError
	) {
		return new InternalRequestError();
	}

	console.error('Unexpected response error type', err);
	return new NotFoundError(err);
};

const runRequest = async (
	req: Express.Request,
	res: Express.Response,
	tx: Db.Tx,
	request: uriParser.ODataRequest,
): Promise<Response> => {
	const { logger } = api[request.vocabulary];

	if (DEBUG) {
		logger.log('Running', req.method, req.url);
	}
	let result: Db.Result | number | undefined;

	try {
		try {
			// Forward each request to the correct method handler
			await runHooks('PRERUN', request.hooks, { req, request, tx });

			switch (request.method) {
				case 'GET':
					result = await runGet(req, request, tx);
					break;
				case 'POST':
					result = await runPost(req, request, tx);
					break;
				case 'PUT':
				case 'PATCH':
				case 'MERGE':
					result = await runPut(req, request, tx);
					break;
				case 'DELETE':
					result = await runDelete(req, request, tx);
					break;
			}
		} catch (err) {
			if (err instanceof db.DatabaseError) {
				prettifyConstraintError(err, request);
				logger.error(err);
				// Override the error message so we don't leak any internal db info
				err.message = 'Database error';
				throw err;
			}
			if (
				err instanceof uriParser.SyntaxError ||
				err instanceof EvalError ||
				err instanceof RangeError ||
				err instanceof ReferenceError ||
				err instanceof SyntaxError ||
				err instanceof TypeError ||
				err instanceof URIError
			) {
				logger.error(err);
				throw new InternalRequestError();
			}
			throw err;
		}

		await runHooks('POSTRUN', request.hooks, { req, request, result, tx });
	} catch (err) {
		await runHooks('POSTRUN-ERROR', request.hooks, {
			req,
			request,
			tx,
			error: err,
		});
		throw err;
	}
	return await prepareResponse(req, res, request, result, tx);
};

const runChangeSet = (
	req: Express.Request,
	res: Express.Response,
	tx: Db.Tx,
) => async (
	env: Map<number, Response>,
	request: uriParser.ODataRequest,
): Promise<Map<number, Response>> => {
	request = updateBinds(env, request);
	const result = await runRequest(req, res, tx, request);
	if (request.id == null) {
		throw new Error('No request id');
	}
	result.headers ??= {};
	result.headers['Content-Id'] = request.id;
	env.set(request.id, result);
	return env;
};

// Requests inside a changeset may refer to resources created inside the
// changeset, the generation of the sql query for those requests must be
// deferred untill the request they reference is run and returns an insert ID.
// This function compiles the sql query of a request which has been deferred
const updateBinds = (
	env: Map<number, Response>,
	request: uriParser.ODataRequest,
) => {
	if (request._defer) {
		request.odataBinds = request.odataBinds.map(([tag, id]) => {
			if (tag === 'ContentReference') {
				const ref = env.get(id);
				if (
					ref?.body == null ||
					typeof ref.body === 'string' ||
					ref.body.id === undefined
				) {
					throw new BadRequestError(
						'Reference to a non existing resource in Changeset',
					);
				}
				return uriParser.parseId(ref.body.id);
			}
			return [tag, id];
		});
	}
	return request;
};

const prepareResponse = async (
	req: Express.Request,
	res: Express.Response,
	request: uriParser.ODataRequest,
	result: any,
	tx: Db.Tx,
): Promise<Response> => {
	switch (request.method) {
		case 'GET':
			return await respondGet(req, res, request, result, tx);
		case 'POST':
			return await respondPost(req, res, request, result, tx);
		case 'PUT':
		case 'PATCH':
		case 'MERGE':
			return await respondPut(req, res, request, result, tx);
		case 'DELETE':
			return await respondDelete(req, res, request, result, tx);
		case 'OPTIONS':
			return await respondOptions(req, res, request, result, tx);
		default:
			throw new MethodNotAllowedError();
	}
};

const checkReadOnlyRequests = (request: uriParser.ODataRequest) => {
	if (request.method !== 'GET') {
		// Only GET requests can be read-only
		return false;
	}
	const { hooks } = request;
	if (hooks == null) {
		// If there are no hooks then it's definitely read-only
		return true;
	}
	// If there are hooks then check that they're all read-only
	return Object.keys(hooks).every((hookType: keyof InstantiatedHooks) => {
		const hookTypeHooks = hooks[hookType];
		return (
			hookTypeHooks == null || hookTypeHooks.every((hook) => hook.readOnlyTx)
		);
	});
};

// This is a helper method to handle using a passed in req.tx when available, or otherwise creating a new tx and cleaning up after we're done.
const runTransaction = async <T>(
	req: HookReq,
	request: uriParser.ODataRequest | uriParser.ODataRequest[],
	callback: (tx: Db.Tx) => Promise<T>,
): Promise<T> => {
	if (req.tx != null) {
		// If an existing tx was passed in then use it.
		return await callback(req.tx);
	}
	if (Array.isArray(request)) {
		if (request.every(checkReadOnlyRequests)) {
			return await db.readTransaction(callback);
		}
	} else if (checkReadOnlyRequests(request)) {
		return await db.readTransaction(callback);
	}
	// Otherwise create a new write transaction and handle tidying it up.
	return await db.transaction(callback);
};

// This is a helper function that will check and add the bind values to the SQL query and then run it.
const runQuery = async (
	tx: Db.Tx,
	request: uriParser.ODataRequest,
	queryIndex?: number,
	returningIdField?: string,
): Promise<Db.Result> => {
	const { vocabulary } = request;
	let { sqlQuery } = request;
	if (sqlQuery == null) {
		throw new InternalRequestError('No SQL query available to run');
	}
	if (request.engine == null) {
		throw new InternalRequestError('No database engine specified');
	}
	if (Array.isArray(sqlQuery)) {
		if (queryIndex == null) {
			throw new InternalRequestError(
				'Received a query index to run but the query is not an array',
			);
		}
		sqlQuery = sqlQuery[queryIndex];
	}

	const { query, bindings } = sqlQuery;
	const values = await getAndCheckBindValues(
		request as RequiredField<typeof request, 'engine'>,
		bindings,
	);

	if (DEBUG) {
		api[vocabulary].logger.log(query, values);
	}

	const sqlResult = await tx.executeSql(query, values, returningIdField);

	if (returningIdField) {
		request.affectedIds = sqlResult.rows.map((row) => row[returningIdField]);
	}

	return sqlResult;
};

const runGet = async (
	_req: Express.Request,
	request: uriParser.ODataRequest,
	tx: Db.Tx,
) => {
	if (request.sqlQuery != null) {
		return await runQuery(tx, request);
	}
};

const respondGet = async (
	req: Express.Request,
	res: Express.Response,
	request: uriParser.ODataRequest,
	result: any,
	tx: Db.Tx,
): Promise<Response> => {
	const vocab = request.vocabulary;
	if (request.sqlQuery != null) {
		const format = request.odataQuery.options?.$format;
		const metadata =
			format != null && typeof format === 'object'
				? format.metadata
				: undefined;
		const d = await odataResponse.process(
			vocab,
			getAbstractSqlModel(request),
			request.resourceName,
			result.rows,
			{ includeMetadata: metadata !== 'none' },
		);

		await runHooks('PRERESPOND', request.hooks, {
			req,
			res,
			request,
			result,
			data: d,
			tx,
		});
		return { body: { d }, headers: { contentType: 'application/json' } };
	} else {
		if (request.resourceName === '$metadata') {
			return {
				body: models[vocab].odataMetadata,
				headers: { contentType: 'xml' },
			};
		} else {
			// TODO: request.resourceName can be '$serviceroot' or a resource and we should return an odata xml document based on that
			return {
				status: 404,
			};
		}
	}
};

const runPost = async (
	_req: Express.Request,
	request: uriParser.ODataRequest,
	tx: Db.Tx,
): Promise<number | undefined> => {
	const { rowsAffected, insertId } = await runQuery(
		tx,
		request,
		undefined,
		getIdField(request),
	);
	if (rowsAffected === 0) {
		throw new PermissionError();
	}
	await validateModel(tx, request.vocabulary, request);

	return insertId;
};

const respondPost = async (
	req: Express.Request,
	res: Express.Response,
	request: uriParser.ODataRequest,
	id: number,
	tx: Db.Tx,
): Promise<Response> => {
	const vocab = request.vocabulary;
	const location = odataResponse.resourceURI(vocab, request.resourceName, id);
	if (DEBUG) {
		api[vocab].logger.log('Insert ID: ', request.resourceName, id);
	}

	let result: AnyObject = { d: [{ id }] };
	if (
		location != null &&
		!['0', 'false'].includes(
			request?.odataQuery?.options?.returnResource as string,
		)
	) {
		try {
			result = (await runURI('GET', location, undefined, tx, req)) as AnyObject;
		} catch {
			// If we failed to fetch the created resource then we use just the id as default.
		}
	}

	await runHooks('PRERESPOND', request.hooks, {
		req,
		res,
		request,
		result,
		tx,
	});

	return {
		status: 201,
		body: result.d[0],
		headers: {
			contentType: 'application/json',
			Location: location,
		},
	};
};

const runPut = async (
	_req: Express.Request,
	request: uriParser.ODataRequest,
	tx: Db.Tx,
): Promise<undefined> => {
	const idField = getIdField(request);

	let rowsAffected: number;
	// If request.sqlQuery is an array it means it's an UPSERT, ie two queries: [InsertQuery, UpdateQuery]
	if (Array.isArray(request.sqlQuery)) {
		// Run the update query first
		({ rowsAffected } = await runQuery(tx, request, 1, idField));
		if (rowsAffected === 0) {
			// Then run the insert query if nothing was updated
			({ rowsAffected } = await runQuery(tx, request, 0, idField));
		}
	} else {
		({ rowsAffected } = await runQuery(tx, request, undefined, idField));
	}
	if (rowsAffected > 0) {
		await validateModel(tx, request.vocabulary, request);
	}
	return undefined;
};

const respondPut = async (
	req: Express.Request,
	res: Express.Response,
	request: uriParser.ODataRequest,
	result: any,
	tx: Db.Tx,
): Promise<Response> => {
	await runHooks('PRERESPOND', request.hooks, {
		req,
		res,
		request,
		result,
		tx,
	});
	return {
		status: 200,
		headers: {},
	};
};
const respondDelete = respondPut;
const respondOptions = respondPut;

const runDelete = async (
	_req: Express.Request,
	request: uriParser.ODataRequest,
	tx: Db.Tx,
): Promise<undefined> => {
	const { rowsAffected } = await runQuery(
		tx,
		request,
		undefined,
		getIdField(request),
	);
	if (rowsAffected > 0) {
		await validateModel(tx, request.vocabulary, request);
	}

	return undefined;
};

export const executeStandardModels = async (tx: Db.Tx): Promise<void> => {
	try {
		// dev model must run first
		await executeModel(tx, {
			apiRoot: 'dev',
			modelText: devModel,
			logging: {
				log: false,
			},
			migrations: {
				'11.0.0-modified-at': `
					ALTER TABLE "model"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				`,
			},
		});
		await executeModels(tx, permissions.config.models);
		console.info('Successfully executed standard models.');
	} catch (err) {
		console.error('Failed to execute standard models.', err);
		throw err;
	}
};

export const setup = async (
	_app: Express.Application,
	$db: Db.Database,
): Promise<void> => {
	exports.db = db = $db;
	try {
		await db.transaction(async (tx) => {
			await executeStandardModels(tx);
			await permissions.setup();
		});
	} catch (err) {
		console.error('Could not execute standard models', err);
		process.exit(1);
	}
	try {
		await db.executeSql(
			'CREATE UNIQUE INDEX "uniq_model_model_type_vocab" ON "model" ("is of-vocabulary", "model type");',
		);
	} catch {
		// we can't use IF NOT EXISTS on all dbs, so we have to ignore the error raised if this index already exists
	}
};

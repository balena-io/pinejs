import * as _express from 'express';
import * as _db from '../database-layer/db';

declare global {
	namespace Express {
		export interface Request {
			tx?: _db.Tx;
			batch?: uriParser.UnparsedRequest[];
		}
	}
}

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
Bluebird.config({
	cancellation: true,
});

import { TypedError } from 'typed-error';
import { cachedCompile } from './cached-compile';

type LFModel = any[];
import * as AbstractSQLCompiler from '@resin/abstract-sql-compiler';
import { version as AbstractSQLCompilerVersion } from '@resin/abstract-sql-compiler/package.json';
import * as LF2AbstractSQL from '@resin/lf-to-abstract-sql';

import {
	odataNameToSqlName,
	sqlNameToODataName,
	SupportedMethod,
} from '@resin/odata-to-abstract-sql';
import * as sbvrTypes from '@resin/sbvr-types';
import deepFreeze = require('deep-freeze');
import { PinejsClientCoreFactory } from 'pinejs-client-core';

import { ExtendedSBVRParser } from '../extended-sbvr-parser/extended-sbvr-parser';

import * as migrator from '../migrator/migrator';
import { generateODataMetadata } from '../odata-metadata/odata-metadata-generator';

// tslint:disable-next-line:no-var-requires
const devModel = require('./dev.sbvr');
import * as permissions from './permissions';
export * from './permissions';
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
export * from './errors';
import {
	HookBlueprint,
	InstantiatedHooks,
	instantiateHooks,
	rollbackRequestHooks,
} from './hooks';

import * as memoize from 'memoizee';
import memoizeWeak = require('memoizee/weak');
import * as controlFlow from './control-flow';

const { DEBUG } = process.env;

export let db = (undefined as any) as _db.Database;

export { sbvrTypes };

import { version as LF2AbstractSQLVersion } from '@resin/lf-to-abstract-sql/package.json';
import { version as sbvrTypesVersion } from '@resin/lf-to-abstract-sql/package.json';
import { Model } from '../config-loader/config-loader';
import {
	compileRequest,
	getAndCheckBindValues,
	isRuleAffected,
} from './abstract-sql';
import { OptionalField, RequiredField } from './common-types';
import { AnyObject } from './sbvr-utils';
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

export interface HookReq {
	user?: User;
	apiKey?: ApiKey;
	method: string;
	url: string;
	query: AnyObject;
	params: AnyObject;
	body: AnyObject;
	custom?: AnyObject;
	tx?: _db.Tx;
	hooks?: InstantiatedHooks<Hooks>;
}

export interface HookArgs {
	req: HookReq;
	request: HookRequest;
	api: PinejsClient;
	tx?: _db.Tx;
}
export type HookResponse = PromiseLike<any> | null | void;
export type HookRequest = uriParser.ODataRequest;

export interface Hooks {
	PREPARSE?: (options: HookArgs) => HookResponse;
	POSTPARSE?: (options: HookArgs) => HookResponse;
	PRERUN?: (options: HookArgs & { tx: _db.Tx }) => HookResponse;
	POSTRUN?: (options: HookArgs & { tx: _db.Tx; result: any }) => HookResponse;
	PRERESPOND?: (
		options: HookArgs & {
			tx: _db.Tx;
			result: any;
			res: any;
			data?: any;
		},
	) => HookResponse;
	'POSTRUN-ERROR'?: (
		options: HookArgs & { error: TypedError | any },
	) => HookResponse;
}
type HookBlueprints = { [key in keyof Hooks]: HookBlueprint[] };
const hookNames: Array<keyof Hooks> = [
	'PREPARSE',
	'POSTPARSE',
	'PRERUN',
	'POSTRUN',
	'PRERESPOND',
	'POSTRUN-ERROR',
];
const isValidHook = (x: any): x is keyof Hooks => _.includes(hookNames, x);

interface VocabHooks {
	[resourceName: string]: HookBlueprints;
}
interface MethodHooks {
	[vocab: string]: VocabHooks;
}
const apiHooks = {
	all: {} as MethodHooks,
	GET: {} as MethodHooks,
	PUT: {} as MethodHooks,
	POST: {} as MethodHooks,
	PATCH: {} as MethodHooks,
	MERGE: {} as MethodHooks,
	DELETE: {} as MethodHooks,
	OPTIONS: {} as MethodHooks,
};

// Share hooks between merge and patch since they are the same operation,
// just MERGE was the OData intermediary until the HTTP spec added PATCH.
apiHooks.MERGE = apiHooks.PATCH;

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
			.map(namePart => {
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
			.flatMap(namePart =>
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

export const validateModel = (
	tx: _db.Tx,
	modelName: string,
	request?: uriParser.ODataRequest,
): Bluebird<void> => {
	return Bluebird.map(models[modelName].sql.rules, async rule => {
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
	}).return();
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
	tx: _db.Tx,
	model: ExecutableModel,
): Bluebird<void> => executeModels(tx, [model]);

export const executeModels = (
	tx: _db.Tx,
	execModels: ExecutableModel[],
): Bluebird<void> =>
	Bluebird.map(execModels, async model => {
		const { apiRoot } = model;

		await migrator.run(tx, model);
		const compiledModel = generateModels(model, db.engine);

		// Create tables related to terms and fact types
		// Run statements sequentially, as the order of the CREATE TABLE statements matters (eg. for foreign keys).
		for (const createStatement of compiledModel.sql.createSchema) {
			const promise = tx.executeSql(createStatement);
			if (db.engine === 'websql') {
				promise.catch(err => {
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
			const defaultSetting = _.get(model.logging, 'default', true);
			for (const k of Object.keys(model.logging)) {
				const key = k as keyof Console;
				if (
					_.isFunction(api[apiRoot].logger[key]) &&
					!_.get(model.logging, [key], defaultSetting)
				) {
					api[apiRoot].logger[key] = _.noop;
				}
			}
		}
		return compiledModel;
		// Only update the dev models once all models have finished executing.
	})
		.map((model: CompiledModel) => {
			const updateModel = async (modelType: keyof CompiledModel) => {
				if (model[modelType] == null) {
					return api.dev.delete({
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
				const result = await api.dev.get({
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
				});

				let method: SupportedMethod = 'POST';
				let uri = '/dev/model';
				const body: AnyObject = {
					is_of__vocabulary: model.vocab,
					model_value: model[modelType],
					model_type: modelType,
				};
				const id = _.get(result, ['0', 'id']);
				if (id != null) {
					uri += '(' + id + ')';
					method = 'PATCH';
					body.id = id;
				} else {
					uri += '?returnResource=false';
				}

				return runURI(method, uri, body, tx, permissions.root);
			};

			return Bluebird.map(
				['se', 'lf', 'abstractSql', 'sql', 'odataMetadata'],
				updateModel,
			);
		})
		.tapCatch(() =>
			Bluebird.map(execModels, ({ apiRoot }) => cleanupModel(apiRoot)),
		)
		.return();

const cleanupModel = (vocab: string) => {
	delete models[vocab];
	delete api[vocab];
};

const mergeHooks = (a: HookBlueprints, b: HookBlueprints): HookBlueprints => {
	return _.mergeWith({}, a, b, (x, y) => {
		if (Array.isArray(x)) {
			return x.concat(y);
		}
	});
};
type HookMethod = keyof typeof apiHooks;
const getResourceHooks = (vocabHooks: VocabHooks, resourceName?: string) => {
	if (vocabHooks == null) {
		return {};
	}
	// When getting the hooks list for the sake of PREPARSE hooks
	// we don't know the resourceName we'll be acting on yet
	if (resourceName == null) {
		return vocabHooks['all'];
	}
	return mergeHooks(vocabHooks[resourceName], vocabHooks['all']);
};
const getVocabHooks = (
	methodHooks: MethodHooks,
	vocabulary: string,
	resourceName?: string,
) => {
	if (methodHooks == null) {
		return {};
	}
	return mergeHooks(
		getResourceHooks(methodHooks[vocabulary], resourceName),
		getResourceHooks(methodHooks['all'], resourceName),
	);
};
const getMethodHooks = memoize(
	(method: SupportedMethod, vocabulary: string, resourceName?: string) =>
		mergeHooks(
			getVocabHooks(apiHooks[method], vocabulary, resourceName),
			getVocabHooks(apiHooks['all'], vocabulary, resourceName),
		),
	{ primitive: true },
);
const getHooks = (
	request: Pick<
		OptionalField<HookRequest, 'resourceName'>,
		'resourceName' | 'method' | 'vocabulary'
	>,
): InstantiatedHooks<Hooks> => {
	let { resourceName } = request;
	if (resourceName != null) {
		resourceName = resolveSynonym(
			request as Pick<HookRequest, 'resourceName' | 'method' | 'vocabulary'>,
		);
	}
	return instantiateHooks(
		getMethodHooks(request.method, request.vocabulary, resourceName),
	);
};
getHooks.clear = () => getMethodHooks.clear();

const runHooks = Bluebird.method(
	(
		hookName: keyof Hooks,
		hooksList: InstantiatedHooks<Hooks> | undefined,
		args: {
			request?: uriParser.ODataRequest;
			req: _express.Request;
			res?: _express.Response;
			tx?: _db.Tx;
			result?: any;
			data?: number | any[];
			error?: TypedError | any;
		},
	) => {
		if (hooksList == null) {
			return;
		}
		const hooks = hooksList[hookName];
		if (hooks == null || hooks.length === 0) {
			return;
		}
		const { request, req, tx } = args;
		if (request != null) {
			const { vocabulary } = request;
			Object.defineProperty(args, 'api', {
				get: _.once(() =>
					api[vocabulary].clone({
						passthrough: { req, tx },
					}),
				),
			});
		}
		return Bluebird.map(hooks, hook => hook.run(args)).return();
	},
);

export const deleteModel = (vocabulary: string) => {
	return db
		.transaction(tx => {
			const dropStatements: Array<Bluebird<any>> = _.map(
				models[vocabulary].sql.dropSchema,
				(dropStatement: string) => tx.executeSql(dropStatement),
			);
			return Bluebird.all(
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
		})
		.then(() => cleanupModel(vocabulary));
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
	return Bluebird.method(async (vocab: string, rule: string) => {
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
		const ruleBody = _.find(ruleAbs, node => node[0] === 'Body') as [
			'Body',
			...any[],
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
			ruleBody[1] = _.map(ruleBody[1], queryPart => {
				if (queryPart[0] !== 'Where') {
					return queryPart;
				}
				if (queryPart.length > 2) {
					throw new Error('Unsupported rule formulation');
				}
				return ['Where', ['Not', queryPart[1]]];
			});
		}

		// Select all
		ruleBody[1] = _.map(ruleBody[1], queryPart => {
			if (queryPart[0] !== 'Select') {
				return queryPart;
			}
			return ['Select', '*'];
		});
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
		let ids = result.rows.map(row => row[table.idField]);
		ids = _.uniq(ids);
		ids = _.map(ids, id => odataIdField + ' eq ' + id);
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
	});
})();

export type Passthrough = AnyObject & {
	req?: {
		user?: User;
	};
	tx?: _db.Tx;
};

export class PinejsClient extends PinejsClientCoreFactory(Bluebird)<
	PinejsClient,
	Bluebird<{}>,
	Bluebird<PinejsClientCoreFactory.PromiseResultTypes>
> {
	public passthrough: Passthrough;
	public _request({
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
		tx?: _db.Tx;
		req?: permissions.PermissionReq;
		custom?: AnyObject;
	}) {
		return runURI(method, url, body, tx, req, custom);
	}
}

export type LoggingClient = PinejsClient & {
	logger: Console;
};
export const api: {
	[vocab: string]: LoggingClient;
} = {};

// We default to guest only permissions if no req object is passed in
export const runURI = (
	method: string,
	uri: string,
	body: AnyObject = {},
	tx?: _db.Tx,
	req?: permissions.PermissionReq,
	custom?: AnyObject,
): Bluebird<PinejsClientCoreFactory.PromiseResultTypes> => {
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
	_.each(body, (v, k) => {
		if (v === undefined) {
			delete body[k];
		}
	});

	const emulatedReq: _express.Request = {
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

	return new Bluebird<PinejsClientCoreFactory.PromiseResultTypes>(
		(resolve, reject) => {
			const res: _express.Response = {
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
					if (statusCode == null) {
						statusCode = this.statusCode;
					}
					this.sendStatus(statusCode);
				},
				json(data: any, statusCode: number) {
					if (_.isError(data)) {
						reject(data);
						return;
					}
					if (statusCode == null) {
						statusCode = this.statusCode;
					}
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

			const next = (route?: string) => {
				console.warn('Next called on a runURI?!', method, uri, route);
				res.sendStatus(500);
			};

			handleODataRequest(emulatedReq, res, next);
		},
	);
};

export const getAbstractSqlModel = (
	request: Pick<uriParser.ODataRequest, 'vocabulary' | 'abstractSqlModel'>,
): AbstractSQLCompiler.AbstractSqlModel => {
	if (request.abstractSqlModel == null) {
		request.abstractSqlModel = models[request.vocabulary].abstractSql;
	}
	return request.abstractSqlModel;
};

export const getAffectedIds = Bluebird.method(
	async ({
		req,
		request,
		tx,
	}: {
		req: HookReq;
		request: HookRequest;
		tx: _db.Tx;
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

		if (request.odataQuery.options == null) {
			request.odataQuery.options = {};
		}
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
			result = await runTransaction(req, newTx => runQuery(newTx, request));
		}
		return _.map(result.rows, idField);
	},
);

export const handleODataRequest: _express.Handler = (req, res, next) => {
	const [, apiRoot] = req.url.split('/', 2);
	if (apiRoot == null || models[apiRoot] == null) {
		return next('route');
	}

	if (DEBUG) {
		api[apiRoot].logger.log('Parsing', req.method, req.url);
	}

	const mapSeries = controlFlow.getMappingFn(req.headers);
	// Get the hooks for the current method/vocabulary as we know it,
	// in order to run PREPARSE hooks, before parsing gets us more info
	const reqHooks = getHooks({
		method: req.method as SupportedMethod,
		vocabulary: apiRoot,
	});

	req.on('close', () => {
		handlePromise.cancel();
		rollbackRequestHooks(reqHooks);
	});
	res.on('close', () => {
		handlePromise.cancel();
		rollbackRequestHooks(reqHooks);
	});

	if (req.tx != null) {
		req.tx.on('rollback', () => {
			rollbackRequestHooks(reqHooks);
		});
	}

	const handlePromise = runHooks('PREPARSE', reqHooks, { req, tx: req.tx })
		.then(() => {
			const { method, url, body } = req;

			let requests: uriParser.UnparsedRequest[];
			// Check if it is a single request or a batch
			if (req.batch != null && req.batch.length > 0) {
				requests = req.batch;
			} else {
				requests = [{ method, url, data: body }];
			}

			// Parse the OData requests
			return mapSeries(requests, requestPart =>
				uriParser
					.parseOData(requestPart)
					.then(
						controlFlow.liftP(async request => {
							request.engine = db.engine;
							// Get the full hooks list now that we can.
							request.hooks = getHooks(request);
							// Add/check the relevant permissions
							try {
								await runHooks('POSTPARSE', request.hooks, {
									req,
									request,
									tx: req.tx,
								});
								const translatedRequest = await uriParser.translateUri(request);
								return await compileRequest(translatedRequest);
							} catch (err) {
								rollbackRequestHooks(reqHooks);
								rollbackRequestHooks(request.hooks);
								throw err;
							}
						}),
					)
					.then(request =>
						// Run the request in its own transaction
						runTransaction<Response | Response[]>(req, tx => {
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
								return Bluebird.reduce(
									request,
									runChangeSet(req, res, tx),
									new Map<number, Response>(),
								).then(env => Array.from(env.values()));
							} else {
								return runRequest(req, res, tx, request);
							}
						}),
					),
			);
		})
		.then(results => {
			const responses = results.map(result => {
				if (_.isError(result)) {
					return convertToHttpError(result);
				} else {
					return result;
				}
			});

			res.set('Cache-Control', 'no-cache');
			// If we are dealing with a single request unpack the response and respond normally
			if (req.batch == null || req.batch.length === 0) {
				let [response] = responses;
				if (_.isError(response)) {
					if ((res as AnyObject).__internalPinejs === true) {
						return res.json(response);
					} else {
						response = {
							status: response.status,
							body: response.getResponseBody(),
						};
					}
				}
				const { body, headers, status } = response as Response;
				if (status) {
					res.status(status);
				}
				_.forEach(headers, (headerValue, headerName) => {
					res.set(headerName, headerValue);
				});

				if (!body) {
					if (status != null) {
						res.sendStatus(status);
					} else {
						console.error('No status or body set', req.url, responses);
						res.sendStatus(500);
					}
				} else {
					if (status != null) {
						res.status(status);
					}
					res.json(body);
				}

				// Otherwise its a multipart request and we reply with the appropriate multipart response
			} else {
				(res.status(200) as any).sendMulti(
					responses.map(response => {
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
		})
		.catch((e: Error) => {
			// If an error bubbles here it must have happened in the last then block
			// We just respond with 500 as there is probably not much we can do to recover
			console.error('An error occurred while constructing the response', e);
			res.sendStatus(500);
		});
	return handlePromise;
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
		err instanceof PermissionParsingError
	) {
		return new InternalRequestError();
	}

	console.error('Unexpected response error type', err);
	return new NotFoundError(err);
};

const runRequest = async (
	req: _express.Request,
	res: _express.Response,
	tx: _db.Tx,
	request: uriParser.ODataRequest,
): Promise<Response> => {
	const { logger } = api[request.vocabulary];

	if (DEBUG) {
		logger.log('Running', req.method, req.url);
	}
	let result: _db.Result | number | undefined;

	try {
		try {
			// Forward each request to the correct method handler
			await runHooks('PRERUN', request.hooks, { req, request, tx });

			switch (request.method) {
				case 'GET':
					result = await runGet(req, res, request, tx);
					break;
				case 'POST':
					result = await runPost(req, res, request, tx);
					break;
				case 'PUT':
				case 'PATCH':
				case 'MERGE':
					result = await runPut(req, res, request, tx);
					break;
				case 'DELETE':
					result = await runDelete(req, res, request, tx);
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
	return prepareResponse(req, res, request, result, tx);
};

const runChangeSet = (
	req: _express.Request,
	res: _express.Response,
	tx: _db.Tx,
) => async (
	env: Map<number, Response>,
	request: uriParser.ODataRequest,
): Promise<Map<number, Response>> => {
	request = updateBinds(env, request);
	const result = await runRequest(req, res, tx, request);
	if (request.id == null) {
		throw new Error('No request id');
	}
	if (result.headers == null) {
		result.headers = {};
	}
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
		request.odataBinds = _.map(request.odataBinds, ([tag, id]) => {
			if (tag === 'ContentReference') {
				const ref = env.get(id);
				if (
					ref == null ||
					ref.body == null ||
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

const prepareResponse = (
	req: _express.Request,
	res: _express.Response,
	request: uriParser.ODataRequest,
	result: any,
	tx: _db.Tx,
): Promise<Response> => {
	switch (request.method) {
		case 'GET':
			return respondGet(req, res, request, result, tx);
		case 'POST':
			return respondPost(req, res, request, result, tx);
		case 'PUT':
		case 'PATCH':
		case 'MERGE':
			return respondPut(req, res, request, result, tx);
		case 'DELETE':
			return respondDelete(req, res, request, result, tx);
		case 'OPTIONS':
			return respondOptions(req, res, request, result, tx);
		default:
			return Bluebird.reject(new MethodNotAllowedError());
	}
};

// This is a helper method to handle using a passed in req.tx when available, or otherwise creating a new tx and cleaning up after we're done.
const runTransaction = <T>(
	req: HookReq,
	callback: (tx: _db.Tx) => Promise<T>,
): Promise<T> => {
	if (req.tx != null) {
		// If an existing tx was passed in then use it.
		return callback(req.tx);
	} else {
		// Otherwise create a new transaction and handle tidying it up.
		return db.transaction(callback);
	}
};

// This is a helper function that will check and add the bind values to the SQL query and then run it.
const runQuery = async (
	tx: _db.Tx,
	request: uriParser.ODataRequest,
	queryIndex?: number,
	addReturning?: string,
): Promise<_db.Result> => {
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

	return tx.executeSql(query, values, addReturning);
};

const runGet = (
	_req: _express.Request,
	_res: _express.Response,
	request: uriParser.ODataRequest,
	tx: _db.Tx,
) => {
	if (request.sqlQuery != null) {
		return runQuery(tx, request);
	}
};

const respondGet = async (
	req: _express.Request,
	res: _express.Response,
	request: uriParser.ODataRequest,
	result: any,
	tx: _db.Tx,
): Promise<Response> => {
	const vocab = request.vocabulary;
	if (request.sqlQuery != null) {
		const d = await odataResponse.process(
			vocab,
			getAbstractSqlModel(request),
			request.resourceName,
			result.rows,
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
	_req: _express.Request,
	_res: _express.Response,
	request: uriParser.ODataRequest,
	tx: _db.Tx,
): Promise<number | undefined> => {
	const vocab = request.vocabulary;

	const { idField } = getAbstractSqlModel(request).tables[
		resolveSynonym(request)
	];

	const { rowsAffected, insertId } = await runQuery(
		tx,
		request,
		undefined,
		idField,
	);
	if (rowsAffected === 0) {
		throw new PermissionError();
	}
	await validateModel(tx, vocab, request);

	return insertId;
};

const respondPost = async (
	req: _express.Request,
	res: _express.Response,
	request: uriParser.ODataRequest,
	id: number,
	tx: _db.Tx,
): Promise<Response> => {
	const vocab = request.vocabulary;
	const location = odataResponse.resourceURI(vocab, request.resourceName, id);
	if (DEBUG) {
		api[vocab].logger.log('Insert ID: ', request.resourceName, id);
	}

	let result: AnyObject = { d: [{ id }] };
	if (
		location != null &&
		!_.includes(
			['0', 'false'],
			_.get(request, ['odataQuery', 'options', 'returnResource']),
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
	_req: _express.Request,
	_res: _express.Response,
	request: uriParser.ODataRequest,
	tx: _db.Tx,
): Promise<undefined> => {
	const vocab = request.vocabulary;

	let rowsAffected: number;
	// If request.sqlQuery is an array it means it's an UPSERT, ie two queries: [InsertQuery, UpdateQuery]
	if (Array.isArray(request.sqlQuery)) {
		// Run the update query first
		({ rowsAffected } = await runQuery(tx, request, 1));
		if (rowsAffected === 0) {
			// Then run the insert query if nothing was updated
			({ rowsAffected } = await runQuery(tx, request, 0));
		}
	} else {
		({ rowsAffected } = await runQuery(tx, request));
	}
	if (rowsAffected > 0) {
		await validateModel(tx, vocab, request);
	}
	return undefined;
};

const respondPut = async (
	req: _express.Request,
	res: _express.Response,
	request: uriParser.ODataRequest,
	_result: any,
	tx: _db.Tx,
): Promise<Response> => {
	await runHooks('PRERESPOND', request.hooks, {
		req,
		res,
		request,
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
	_req: _express.Request,
	_res: _express.Response,
	request: uriParser.ODataRequest,
	tx: _db.Tx,
): Promise<undefined> => {
	const vocab = request.vocabulary;

	const { rowsAffected } = await runQuery(tx, request);
	if (rowsAffected > 0) {
		await validateModel(tx, vocab, request);
	}

	return undefined;
};

export const executeStandardModels = (tx: _db.Tx): Bluebird<void> => {
	// dev model must run first
	return executeModel(tx, {
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
	})
		.then(() => {
			return executeModels(tx, permissions.config.models);
		})
		.then(() => {
			console.info('Successfully executed standard models.');
		})
		.tapCatch((err: Error) => {
			console.error('Failed to execute standard models.', err);
		});
};

export const addSideEffectHook = (
	method: HookMethod,
	apiRoot: string,
	resourceName: string,
	hooks: Hooks,
): void => {
	const sideEffectHook = _.mapValues(hooks, hook => {
		if (hook != null) {
			return {
				HOOK: hook,
				effects: true,
			};
		}
	});
	addHook(method, apiRoot, resourceName, sideEffectHook);
};

export const addPureHook = (
	method: HookMethod,
	apiRoot: string,
	resourceName: string,
	hooks: Hooks,
): void => {
	const pureHooks = _.mapValues(hooks, hook => {
		if (hook != null) {
			return {
				HOOK: hook,
				effects: false,
			};
		}
	});
	addHook(method, apiRoot, resourceName, pureHooks);
};

const addHook = (
	method: keyof typeof apiHooks,
	apiRoot: string,
	resourceName: string,
	hooks: { [key in keyof Hooks]: HookBlueprint },
) => {
	const methodHooks = apiHooks[method];
	if (methodHooks == null) {
		throw new Error('Unsupported method: ' + method);
	}
	if (apiRoot !== 'all' && models[apiRoot] == null) {
		throw new Error('Unknown api root: ' + apiRoot);
	}
	if (resourceName !== 'all') {
		const origResourceName = resourceName;
		resourceName = resolveSynonym({ vocabulary: apiRoot, resourceName });
		if (models[apiRoot].abstractSql.tables[resourceName] == null) {
			throw new Error(
				'Unknown resource for api root: ' + origResourceName + ', ' + apiRoot,
			);
		}
	}

	if (methodHooks[apiRoot] == null) {
		methodHooks[apiRoot] = {};
	}
	const apiRootHooks = methodHooks[apiRoot];
	if (apiRootHooks[resourceName] == null) {
		apiRootHooks[resourceName] = {};
	}

	const resourceHooks = apiRootHooks[resourceName];

	for (const hookType of Object.keys(hooks)) {
		if (!isValidHook(hookType)) {
			throw new Error('Unknown callback type: ' + hookType);
		}
		const hook = hooks[hookType];
		if (resourceHooks[hookType] == null) {
			resourceHooks[hookType] = [];
		}
		if (hook != null) {
			resourceHooks[hookType]!.push(hook);
		}
	}

	getHooks.clear();
};

export const setup = (
	_app: _express.Application,
	$db: _db.Database,
): Bluebird<void> => {
	exports.db = db = $db;
	return db
		.transaction(async tx => {
			await executeStandardModels(tx);
			await permissions.setup();
		})
		.catch(err => {
			console.error('Could not execute standard models', err);
			process.exit(1);
		})
		.then(
			() =>
				db
					.executeSql(
						'CREATE UNIQUE INDEX "uniq_model_model_type_vocab" ON "model" ("is of-vocabulary", "model type");',
					)
					.catch(_.noop), // we can't use IF NOT EXISTS on all dbs, so we have to ignore the error raised if this index already exists
		)
		.return();
};

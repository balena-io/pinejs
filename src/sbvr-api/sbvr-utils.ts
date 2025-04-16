import type Express from 'express';
import type * as Db from '../database-layer/db.js';
import type { Model } from '../config-loader/config-loader.js';
import type { AnyObject, RequiredField } from './common-types.js';
import type {
	PickDeferred,
	Resource,
} from '@balena/abstract-sql-to-typescript';

// Augment the Express typings
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		export interface Request {
			tx?: Db.Tx;
			batch?: uriParser.UnparsedRequest[];
		}
	}
}

import _ from 'lodash';

import type { TypedError } from 'typed-error';
import { cachedCompile } from './cached-compile.js';

type LFModel = any[];
import AbstractSQLCompiler from '@balena/abstract-sql-compiler';
import AbstractSqlCompilerPackage from '@balena/abstract-sql-compiler/package.json' with { type: 'json' };
const { version: AbstractSQLCompilerVersion } = AbstractSqlCompilerPackage;

import LF2AbstractSQL from '@balena/lf-to-abstract-sql';

import {
	type ODataBinds,
	odataNameToSqlName,
	sqlNameToODataName,
	type SupportedMethod,
} from '@balena/odata-to-abstract-sql';
import $sbvrTypes from '@balena/sbvr-types';
const { default: sbvrTypes } = $sbvrTypes;
import deepFreeze from 'deep-freeze';
import type { ODataOptions, Params } from 'pinejs-client-core';
import { PinejsClientCore, type PromiseResultTypes } from 'pinejs-client-core';

import { ExtendedSBVRParser } from '../extended-sbvr-parser/extended-sbvr-parser.js';

import * as asyncMigrator from '../migrator/async.js';
import * as syncMigrator from '../migrator/sync.js';
import { generateODataMetadata } from '../odata-metadata/odata-metadata-generator.js';
import { importSBVR } from '../server-glue/sbvr-loader.js';
import { generateODataMetadataAsOpenApi } from '../odata-metadata/open-api-specification-generator.js';

import type DevModel from './dev.js';
const devModel = await importSBVR('./dev.sbvr', import.meta);
import * as permissions from './permissions.js';
import {
	BadRequestError,
	ConflictError,
	HttpError,
	InternalRequestError,
	MethodNotAllowedError,
	ParsingError,
	PermissionError,
	PermissionParsingError,
	SbvrValidationError,
	SqlCompilationError,
	statusCodeToError,
	TranslationError,
	UnauthorizedError,
} from './errors.js';
import * as uriParser from './uri-parser.js';
export type { ODataRequest } from './uri-parser.js';
import {
	type HookReq,
	type HookArgs,
	rollbackRequestHooks,
	getHooks,
	runHooks,
	type InstantiatedHooks,
} from './hooks.js';
export {
	type HookReq,
	type HookArgs,
	type HookResponse,
	type Hooks,
	addPureHook,
	addSideEffectHook,
} from './hooks.js';

import memoizeWeak from 'memoizee/weak.js';
import * as controlFlow from './control-flow.js';

export let db = undefined as any as Db.Database;

export { sbvrTypes };

import LF2AbstractSQLPackage from '@balena/lf-to-abstract-sql/package.json' with { type: 'json' };
const { version: LF2AbstractSQLVersion } = LF2AbstractSQLPackage;
import SbvrTypesPackage from '@balena/sbvr-types/package.json' with { type: 'json' };
const { version: sbvrTypesVersion } = SbvrTypesPackage;

import {
	compileRequest,
	getAndCheckBindValues,
	isRuleAffected,
} from './abstract-sql.js';
export { resolveOdataBind } from './abstract-sql.js';
import * as odataResponse from './odata-response.js';
import { env } from '../server-glue/module.js';
import { translateAbstractSqlModel } from './translations.js';
import {
	type MigrationExecutionResult,
	setExecutedMigrations,
} from '../migrator/utils.js';
import { metadataEndpoints } from './uri-parser.js';

const LF2AbstractSQLTranslator = LF2AbstractSQL.createTranslator(sbvrTypes);
const LF2AbstractSQLTranslatorVersion = `${LF2AbstractSQLVersion}+${sbvrTypesVersion}`;

export type ExecutableModel =
	| RequiredField<Model, 'apiRoot' | 'modelText'>
	| RequiredField<Model, 'apiRoot' | 'abstractSql'>;

interface CompiledModel {
	vocab: string;
	translateTo?: string;
	resourceRenames?: ReturnType<typeof translateAbstractSqlModel>;
	se?: string | undefined;
	lf?: LFModel | undefined;
	abstractSql: AbstractSQLCompiler.AbstractSqlModel;
	sql?: AbstractSQLCompiler.SqlModel;
	odataMetadata: ReturnType<typeof generateODataMetadata>;
}
const models: {
	[vocabulary: string]: CompiledModel & {
		versions: string[];
		modelExecutionResult?: ModelExecutionResult;
	};
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
	actor: number;
}

export interface Response {
	statusCode: number;
	headers?:
		| {
				[headerName: string]: any;
		  }
		| undefined;
	body?: AnyObject | string;
}

export type ModelExecutionResult =
	| undefined
	| {
			migrationExecutionResult?: MigrationExecutionResult;
	  };

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
		const navigation = odataNameToSqlName(navigationName)
			.split('-')
			.flatMap((namePart) =>
				memoizedResolvedSynonym(abstractSqlModel, namePart).split('-'),
			);
		navigation.push('$');
		const resolvedResourceName = memoizedResolvedSynonym(
			abstractSqlModel,
			resourceName,
		);
		const mapping = _.get(
			abstractSqlModel.relationships[resolvedResourceName],
			navigation,
		);
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
		let keyMatches: RegExpExecArray | null = null;
		let violatedConstraintInfo:
			| {
					table: AbstractSQLCompiler.AbstractSqlTable;
					name: string;
			  }
			| undefined;
		if (err instanceof db.UniqueConstraintError) {
			switch (db.engine) {
				case 'mysql':
					keyMatches =
						/ER_DUP_ENTRY: Duplicate entry '.*?[^\\]' for key '(.*?[^\\])'/.exec(
							err.message,
						);
					break;
				case 'postgres': {
					const resourceName = resolveSynonym(request);
					const abstractSqlModel = getFinalAbstractSqlModel(request);
					const table = abstractSqlModel.tables[resourceName];
					keyMatches = new RegExp('"' + table.name + '_(.*?)_key"').exec(
						err.message,
					);
					// no need to run the regex if a `_key` error was already matched, or if there are
					// no indexes on the table (since those are the only supported uniqueness errors atm)
					if (keyMatches == null && table.indexes.length > 0) {
						const indexConstraintName =
							/duplicate key value violates unique constraint "(.*)"/.exec(
								err.message,
							)?.[1];
						if (indexConstraintName != null) {
							violatedConstraintInfo = {
								table,
								name: indexConstraintName,
							};
						}
					}
					break;
				}
			}
			if (keyMatches != null) {
				const columns = keyMatches[1].split('_');
				throw new db.UniqueConstraintError(
					'"' +
						columns.map(sqlNameToODataName).join('" and "') +
						'" must be unique.',
				);
			}
			if (violatedConstraintInfo != null) {
				const { table, name: violatedConstraintName } = violatedConstraintInfo;
				const violatedUniqueIndex = table.indexes.find(
					(idx) => idx.name === violatedConstraintName,
				);
				if (violatedUniqueIndex?.description != null) {
					throw new BadRequestError(violatedUniqueIndex.description);
				}
			}
			// We know it's the right error type, so if matches exists just throw a generic error message, since we have failed to get the info for a more specific one.
			throw new db.UniqueConstraintError('Unique key constraint violated');
		}

		if (err instanceof db.ExclusionConstraintError) {
			// Rewrite to a generic message as we don't yet have a way to get a more specific error message
			throw new db.ExclusionConstraintError('Exclusion constraint violated');
		}

		if (err instanceof db.ForeignKeyConstraintError) {
			switch (db.engine) {
				case 'mysql':
					keyMatches =
						/ER_ROW_IS_REFERENCED_: Cannot delete or update a parent row: a foreign key constraint fails \(".*?"\.(".*?").*/.exec(
							err.message,
						);
					break;
				case 'postgres': {
					const resourceName = resolveSynonym(request);
					const abstractSqlModel = getFinalAbstractSqlModel(request);
					const tableName = abstractSqlModel.tables[resourceName].name;
					keyMatches = new RegExp(
						'"' +
							tableName +
							'" violates foreign key constraint ".*?" on table "(.*?)"',
					).exec(err.message);
					keyMatches ??= new RegExp(
						'"' +
							tableName +
							'" violates foreign key constraint "' +
							tableName +
							'_(.*?)_fkey"',
					).exec(err.message);
					break;
				}
			}
			// We know it's the right error type, so if no matches exists just throw a generic error message,
			// since we have failed to get the info for a more specific one.
			if (keyMatches == null) {
				throw new db.ForeignKeyConstraintError(
					'Foreign key constraint violated',
				);
			}
			throw new db.ForeignKeyConstraintError(
				'Data is referenced by ' + sqlNameToODataName(keyMatches[1]) + '.',
			);
		}

		if (err instanceof db.CheckConstraintError) {
			const resourceName = resolveSynonym(request);
			const abstractSqlModel = getFinalAbstractSqlModel(request);
			const table = abstractSqlModel.tables[resourceName];
			if (table.checks) {
				switch (db.engine) {
					case 'postgres':
						keyMatches = new RegExp(
							'new row for relation "' +
								table.name +
								'" violates check constraint "(.*?)"',
						).exec(err.message);
						break;
				}
			}
			if (keyMatches != null) {
				const checkName = keyMatches[1];
				const check = table.checks!.find((c) => c.name === checkName);
				if (check?.description != null) {
					throw new BadRequestError(check.description);
				}
			}
			// We know it's the right error type, so just throw a generic error message
			// if we have failed to get the info for a more specific one.
			throw new BadRequestError('Check constraint violated');
		}

		// Override the error message so we don't leak any internal db info
		err.message = 'Constraint failed';
		throw err;
	}
};

let cachedIsModelNew: Set<string> | undefined;

/**
 *
 * @param tx database transaction - Needs to be executed in one contained config-loader transaction
 * @param modelName name of the model to check the database for existence
 * @returns true when the model was existing in database before pine config-loader is executed,
 * 			false when the model was not existing before config-loader was executed.
 *
 * ATTENTION: This function needs to be executed in the same transaction as all model manipulating
 * operations are executed in (as migration table operations). Otherwise it's possible that an INSERT INTO "model"
 * statement executes and succeeds. Then afterwards execution fails and the isModelNew request would return `false`.
 * In the case of migrations the table wouldn't have an entry and therefore it would try to run all the historical
 * migrations on a new model.
 */

export const isModelNew = async (
	tx: Db.Tx,
	modelName: string,
): Promise<boolean> => {
	const result = await tx.tableList("name = 'model'");
	if (result.rows.length === 0) {
		return true;
	}
	if (cachedIsModelNew == null) {
		const { rows } = await tx.executeSql(
			`SELECT "is of-vocabulary" FROM "model";`,
		);
		cachedIsModelNew = new Set<string>(
			rows.map((row) => row['is of-vocabulary']),
		);
	}

	return !cachedIsModelNew.has(modelName);
};

const bindsForAffectedIds = (
	bindings: AbstractSQLCompiler.Binding[],
	request?: Pick<
		uriParser.ODataRequest,
		| 'vocabulary'
		| 'abstractSqlModel'
		| 'method'
		| 'resourceName'
		| 'affectedIds'
	>,
) => {
	if (request?.affectedIds == null) {
		return {};
	}

	const tableName =
		getAbstractSqlModel(request).tables[resolveSynonym(request)].name;

	// If we're deleting the affected IDs then we can't narrow our rule to
	// those IDs that are now missing
	const isDelete = request.method === 'DELETE';

	const odataBinds: { [key: string]: any } = {};
	for (const bind of bindings) {
		if (
			bind.length !== 2 ||
			bind[0] !== 'Bind' ||
			typeof bind[1] !== 'string'
		) {
			continue;
		}

		const bindName = bind[1];
		if (!isDelete && bindName === tableName) {
			odataBinds[bindName] = ['Text', `{${request.affectedIds}}`];
		} else {
			odataBinds[bindName] = ['Text', '{}'];
		}
	}

	return odataBinds;
};

const validateModel = async (
	tx: Db.Tx,
	modelName: string,
	request?: Pick<
		uriParser.ODataRequest,
		| 'abstractSqlQuery'
		| 'modifiedFields'
		| 'method'
		| 'vocabulary'
		| 'resourceName'
		| 'affectedIds'
	>,
): Promise<void> => {
	const { sql } = models[modelName];
	if (!sql) {
		throw new Error(`Tried to validate a virtual model: '${modelName}'`);
	}
	await Promise.all(
		sql.rules.map(async (rule) => {
			if (!isRuleAffected(rule, request)) {
				// If none of the fields intersect we don't need to run the rule! :D
				return;
			}

			const values = await getAndCheckBindValues(
				{
					vocabulary: modelName,
					// TODO: `odataBinds` is of type `ODataBinds`, which is an
					// array with extra arbitrary fields. `getAndCheckBindValues`
					// accepts that and also a pure object form for this
					// argument. Given how arrays have predefined symbols,
					// `bindsForAffectedIds` cannot return an `ODataBinds`.
					// Both `ODataBinds` and `getAndCheckBindValues` should be
					// fixed to accept a pure object with both string and
					// numerical keys, for named and positional binds
					// respectively
					odataBinds: bindsForAffectedIds(rule.bindings, request) as any,
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

export const generateSqlModel = (
	abstractSql: AbstractSQLCompiler.AbstractSqlModel,
	targetDatabaseEngine: AbstractSQLCompiler.Engines,
): AbstractSQLCompiler.SqlModel =>
	cachedCompile(
		'sqlModel',
		AbstractSQLCompilerVersion + '+' + targetDatabaseEngine,
		abstractSql,
		() => AbstractSQLCompiler[targetDatabaseEngine].compileSchema(abstractSql),
	);

export function generateModels(
	model: ExecutableModel & { translateTo?: undefined },
	targetDatabaseEngine: AbstractSQLCompiler.Engines,
): RequiredField<CompiledModel, 'sql'>;
export function generateModels(
	model: ExecutableModel,
	targetDatabaseEngine: AbstractSQLCompiler.Engines,
): CompiledModel;
export function generateModels(
	model: ExecutableModel,
	targetDatabaseEngine: AbstractSQLCompiler.Engines,
): CompiledModel {
	const { apiRoot: vocab, modelText: se, translateTo, translations } = model;
	let { abstractSql: maybeAbstractSql } = model;

	let lf: ReturnType<typeof generateLfModel> | undefined;
	if (se) {
		try {
			lf = generateLfModel(se);
		} catch (e) {
			console.error(`Error parsing model '${vocab}':`, e);
			throw new Error(`Error parsing model '${vocab}': ${e}`);
		}

		try {
			maybeAbstractSql = generateAbstractSqlModel(lf);
		} catch (e) {
			console.error(`Error translating model '${vocab}':`, e);
			throw new Error(`Error translating model '${vocab}': ${e}`);
		}
	}
	const abstractSql = maybeAbstractSql!;

	const odataMetadata = cachedCompile(
		'metadata',
		generateODataMetadata.version,
		{ vocab, abstractSqlModel: abstractSql },
		() => generateODataMetadata(vocab, abstractSql),
	);

	let sql: AbstractSQLCompiler.SqlModel | undefined;
	let resourceRenames: ReturnType<typeof translateAbstractSqlModel> | undefined;

	if (translateTo != null) {
		resourceRenames = translateAbstractSqlModel(
			abstractSql,
			models[translateTo].abstractSql,
			model.apiRoot,
			translateTo,
			translations,
		);
	} else {
		for (const [key, table] of Object.entries(abstractSql.tables)) {
			// Alias the current version so it can be explicitly referenced
			abstractSql.tables[`${key}$${model.apiRoot}`] = { ...table };
		}
		try {
			sql = generateSqlModel(abstractSql, targetDatabaseEngine);
		} catch (e) {
			console.error(`Error compiling model '${vocab}':`, e);
			throw new Error(`Error compiling model '${vocab}': ${e}`);
		}
	}

	return {
		vocab,
		translateTo,
		resourceRenames,
		se,
		lf,
		abstractSql,
		sql,
		odataMetadata,
	};
}

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

				const migrationExecutionResult = await syncMigrator.run(tx, model);
				const compiledModel = generateModels(model, db.engine);

				if (compiledModel.sql) {
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
				}
				await syncMigrator.postRun(tx, model);

				odataResponse.prepareModel(compiledModel.abstractSql);
				deepFreeze(compiledModel.abstractSql);

				const versions = [apiRoot];
				if (compiledModel.translateTo != null) {
					versions.push(...models[compiledModel.translateTo].versions);
				}
				models[apiRoot] = {
					...compiledModel,
					versions,
					modelExecutionResult: {
						migrationExecutionResult,
					},
				};

				// Validate the [empty] model according to the rules.
				// This may eventually lead to entering obligatory data.
				// For the moment it blocks such models from execution.
				if (compiledModel.sql) {
					await validateModel(tx, apiRoot);
				}

				api[apiRoot] = new PinejsClient('/' + apiRoot + '/');

				logger[apiRoot] = { ...console };
				if (model.logging != null) {
					const defaultSetting = model.logging?.default ?? true;
					const log = logger[apiRoot];
					for (const k of Object.keys(model.logging)) {
						const key = k as keyof Console;
						if (
							key !== 'Console' &&
							typeof log[key] === 'function' &&
							!(model.logging?.[key] ?? defaultSetting)
						) {
							log[key] = _.noop;
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
						await api.dev.delete({
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
						return;
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
						model_value:
							typeof model[modelType] === 'string'
								? { value: model[modelType] }
								: model[modelType],
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

		await Promise.all(
			execModels.map(async (model) => {
				await asyncMigrator.run(tx, model);
			}),
		);
		// Allow the migrations to be GCed after we are done
		// executing the models & their migrations.
		for (const model of execModels) {
			if (model.migrations != null) {
				delete model.migrations;
			}
		}
	} catch (err) {
		for (const { apiRoot } of execModels) {
			cleanupModel(apiRoot);
		}
		throw err;
	}
};

export const postExecuteModels = async (tx: Db.Tx): Promise<void> => {
	// Executing the `migrations` model takes place after other models have been executed.
	// Hence, skipped migrations from earlier models are not set as executed as the `migration` table is missing
	// Here the skipped migrations that haven't been set properly are covered
	// This is mostly an edge case when running on an empty database schema and migrations model hasn't been executed, yet.
	// One specific case are tests to run tests against migrated and unmigrated database states

	for (const modelKey of Object.keys(models)) {
		const pendingToSetExecutedMigrations =
			models[modelKey]?.modelExecutionResult?.migrationExecutionResult
				?.pendingUnsetMigrations;
		if (pendingToSetExecutedMigrations != null) {
			await setExecutedMigrations(tx, modelKey, pendingToSetExecutedMigrations);
		}
	}
};

const cleanupModel = (vocab: string) => {
	delete models[vocab];
	delete api[vocab];
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
		const log = logger[vocab];
		let lfModel: LFModel;
		let slfModel: LFModel;
		let abstractSqlModel: AbstractSQLCompiler.AbstractSqlModel;

		try {
			lfModel = ExtendedSBVRParser.matchAll(
				seModel + '\nRule: ' + rule,
				'Process',
			);
		} catch (e) {
			log.error('Error parsing rule', rule, e);
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
			log.error('Error compiling rule', rule, e);
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
		const ruleAbs = abstractSqlModel.rules.at(-1);
		if (ruleAbs == null) {
			throw new Error('Unable to generate rule');
		}
		const ruleBody = ruleAbs.find((node) => node[0] === 'Body') as [
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
				odataBinds: [] as any as ODataBinds,
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

/**
 * This type shows the passthrough properties that the internal pinejs client instance accepts
 */
export type Passthrough = AnyObject & {
	req?: {
		user?: User;
	};
	tx?: Db.Tx;
};

export class PinejsClient<
	M extends {
		[key in keyof M]: Resource;
	} = {
		[key in string]: {
			Read: AnyObject;
			Write: AnyObject;
		};
	},
> extends PinejsClientCore<M> {
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
		return (await runURI(method, url, body, tx, req, custom)) as object;
	}

	public post<TResource extends keyof M & string>(
		params: {
			resource: TResource;
			options?: Params<M[TResource]>['options'] & { returnResource?: true };
		} & Params<M[TResource]>,
	): Promise<PickDeferred<M[TResource]['Read']>>;
	public post<TResource extends keyof M & string>(
		params: {
			resource: TResource;
			options: Params<M[TResource]>['options'] & { returnResource: boolean };
		} & Params<M[TResource]>,
	): Promise<Pick<M[TResource]['Read'], 'id'>>; // TODO: This should use the primary key rather than hardcoding `id`
	public post(params: Params): Promise<AnyObject> {
		return super.post(params as Parameters<PinejsClient<M>['post']>[0]);
	}
	public compileAuth<TResource extends keyof M & string>(params: {
		modelName: string;
		access: string;
		resource: TResource;
		options?: Pick<ODataOptions<M[TResource]['Read']>, '$filter'>;
	}): string {
		const { modelName, access, resource, options } = params;
		if (typeof modelName !== 'string') {
			throw new Error('The modelName property must be specified.');
		}
		if (typeof access !== 'string') {
			throw new Error('The access property must be specified.');
		}
		if (typeof resource !== 'string') {
			throw new Error('The resource must be specified.');
		}

		const authBase = `${modelName}.${resource}.${access}`;
		if (options?.$filter == null) {
			return authBase;
		}
		const url = this.compile({ resource, options });
		const queryParamsIndex = url.indexOf('?');
		if (queryParamsIndex === -1) {
			throw new Error(`Failed to compile permissions for url: ${url}`);
		}
		const queryParams = new URLSearchParams(url.slice(queryParamsIndex + 1));
		let compiledFilter = queryParams.get('$filter');
		if (compiledFilter == null) {
			throw new Error(`Failed to find $filter permissions for url: ${url}`);
		}
		compiledFilter = compiledFilter.replace(
			/Auth\.canAccess\(\)/g,
			'canAccess()',
		);
		return `${authBase}?${compiledFilter}`;
	}
}

export interface API {
	[vocab: string]: PinejsClient;
}
export const api = {} as API;
export const logger: {
	[vocab: string]: Console;
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

	if (req != null && typeof req === 'object') {
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

	const { promise } = runODataRequest(emulatedReq, apiRoot);

	const [response] = await promise;

	if (response instanceof Error) {
		throw response;
	}

	const { body: responseBody, statusCode, headers } = response as Response;

	if (statusCode != null && statusCode >= 400) {
		const ErrorClass =
			statusCodeToError[statusCode as keyof typeof statusCodeToError];
		if (ErrorClass != null) {
			throw new ErrorClass(undefined, responseBody, headers);
		}
		throw new HttpError(statusCode, undefined, responseBody, headers);
	}

	return responseBody as AnyObject | undefined;
};

export const getAbstractSqlModel = (
	request: Pick<uriParser.ODataRequest, 'vocabulary' | 'abstractSqlModel'>,
): AbstractSQLCompiler.AbstractSqlModel => {
	return (request.abstractSqlModel ??= models[request.vocabulary].abstractSql);
};

const getFinalAbstractSqlModel = (
	request: Pick<
		uriParser.ODataRequest,
		'translateVersions' | 'finalAbstractSqlModel'
	>,
): AbstractSQLCompiler.AbstractSqlModel => {
	const finalModel = request.translateVersions.at(-1)!;
	return (request.finalAbstractSqlModel ??= models[finalModel].abstractSql);
};

const getIdField = (
	request: Pick<
		uriParser.ODataRequest,
		| 'translateVersions'
		| 'finalAbstractSqlModel'
		| 'abstractSqlModel'
		| 'resourceName'
		| 'vocabulary'
	>,
) =>
	// TODO: Should resolveSynonym also be using the finalAbstractSqlModel?
	getFinalAbstractSqlModel(request).tables[resolveSynonym(request)].idField;

export const getAffectedIds = async <Vocab extends string>(
	args: HookArgs<Vocab> & {
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

	// Store the affected ids and delete the pending promise to allow it to be GCed sooner.
	request.affectedIds = await request.pendingAffectedIds;
	delete request.pendingAffectedIds;

	return request.affectedIds;
};

const $getAffectedIds = async <Vocab extends string>({
	req,
	request,
	tx,
}: HookArgs<Vocab> & {
	tx: Db.Tx;
}): Promise<number[]> => {
	if (!['PATCH', 'DELETE'].includes(request.method)) {
		// We can only find the affected ids in advance for requests that modify existing records, if they
		// can insert new records (POST/PUT) then we're unable to find the ids until the request has actually run
		// and for GETs nothing is affected
		throw new Error(
			'Can only call `getAffectedIds` with PATCH/DELETE requests',
		);
	}
	// We reparse to make sure we get a clean odataQuery, without permissions already added
	// And we use the request's url rather than the req for things like batch where the req url is ../$batch
	const parsedRequest: uriParser.ParsedODataRequest &
		Partial<Pick<uriParser.ODataRequest, 'engine' | 'translateVersions'>> =
		uriParser.parseOData({
			method: request.method,
			url: `/${request.vocabulary}${request.url}`,
		});

	parsedRequest.engine = request.engine;
	parsedRequest.translateVersions = request.translateVersions;
	// Mark that the engine is required now that we've set it
	let affectedRequest: uriParser.ODataRequest = parsedRequest as RequiredField<
		typeof parsedRequest,
		'engine' | 'translateVersions'
	>;
	const abstractSqlModel = getAbstractSqlModel(affectedRequest);
	const resourceName = resolveSynonym(affectedRequest);
	const resourceTable = abstractSqlModel.tables[resourceName];
	if (resourceTable == null) {
		throw new Error('Unknown resource: ' + affectedRequest.resourceName);
	}
	const { idField } = resourceTable;

	affectedRequest.odataQuery.options ??= {};
	affectedRequest.odataQuery.options.$select = {
		properties: [{ name: idField }],
	};

	// Delete any $expand that might exist as they're ignored on non-GETs but we're converting this request to a GET
	delete affectedRequest.odataQuery.options.$expand;

	await permissions.addPermissions(req, affectedRequest);

	affectedRequest.method = 'GET';

	affectedRequest = uriParser.translateUri(affectedRequest);
	affectedRequest = compileRequest(affectedRequest);

	let result;
	if (tx != null) {
		result = await runQuery(tx, affectedRequest);
	} else {
		result = await runTransaction(req, affectedRequest, (newTx) =>
			runQuery(newTx, affectedRequest),
		);
	}
	return result.rows.map((row) => row[idField]);
};

export const getModel = (vocabulary: string) => {
	return models[vocabulary];
};

const runODataRequest = (req: Express.Request, vocabulary: string) => {
	if (env.DEBUG) {
		logger[vocabulary].log('Parsing', req.method, req.url);
	}

	// Get the hooks for the current method/vocabulary as we know it,
	// in order to run PREPARSE hooks, before parsing gets us more info
	const { versions } = models[vocabulary];
	const reqHooks = versions.map((version): [string, InstantiatedHooks] => [
		version,
		getHooks(
			{
				method: req.method as SupportedMethod,
				vocabulary: version,
			},
			// Only include the `all` vocab for the first model version
			version === versions[0],
		),
	]);

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

	const mappingFn = controlFlow.getMappingFn(req.headers);

	return {
		tryCancelRequest,
		promise: (async (): Promise<Array<Response | Response[] | HttpError>> => {
			await runHooks('PREPARSE', reqHooks, { req, tx: req.tx });
			let requests: uriParser.UnparsedRequest[];
			// Check if it is a single request or a batch
			if (req.batch != null && req.batch.length > 0) {
				requests = req.batch;
			} else {
				const { method, url, body } = req;
				requests = [{ method, url, data: body }];
			}

			const prepareRequest = async (
				parsedRequest: uriParser.ParsedODataRequest &
					Partial<Pick<uriParser.ODataRequest, 'engine' | 'translateVersions'>>,
			): Promise<uriParser.ODataRequest> => {
				const abstractSqlModel = getAbstractSqlModel(parsedRequest);
				if (abstractSqlModel == null) {
					throw new BadRequestError(
						'Unknown vocabulary: ' + parsedRequest.vocabulary,
					);
				}
				parsedRequest.engine = db.engine;
				parsedRequest.translateVersions = [...versions];
				// Mark that the engine/translateVersions is required now that we've set it
				const $request: uriParser.ODataRequest = parsedRequest as RequiredField<
					typeof parsedRequest,
					'engine' | 'translateVersions'
				>;
				// Add/check the relevant permissions
				try {
					const resolvedResourceName = $request.resourceName.endsWith(
						'#canAccess',
					)
						? resolveSynonym({
								...$request,
								resourceName: $request.resourceName.slice(
									0,
									-'#canAccess'.length,
								),
							})
						: resolveSynonym($request);

					if (
						abstractSqlModel.tables[resolvedResourceName] == null &&
						!metadataEndpoints.includes(resolvedResourceName)
					) {
						throw new UnauthorizedError();
					}

					$request.hooks = [];
					for (const version of versions) {
						// We get the hooks list between each `runHooks` so that any resource renames will be used
						// when getting hooks for later versions
						const hooks: [string, InstantiatedHooks] = [
							version,
							getHooks(
								{
									resourceName: $request.resourceName,
									vocabulary: version,
									method: $request.method,
								},
								// Only include the `all` vocab for the first model version
								version === versions[0],
							),
						];
						$request.hooks.push(hooks);
						await runHooks('POSTPARSE', [hooks], {
							req,
							request: $request,
							tx: req.tx,
						});
						const { resourceRenames } = models[version];
						if (resourceRenames) {
							const resourceName = resolveSynonym($request);
							if (resourceRenames[resourceName]) {
								$request.resourceName = sqlNameToODataName(
									resourceRenames[resourceName],
								);
							}
						}
					}
					const translatedRequest = uriParser.translateUri($request);
					return compileRequest(translatedRequest);
				} catch (err: any) {
					rollbackRequestHooks(reqHooks);
					rollbackRequestHooks($request.hooks);
					throw err;
				}
			};

			// Parse the OData requests
			const results = await mappingFn(requests, async (requestPart) => {
				const parsedRequest = uriParser.parseOData(requestPart);

				let request: uriParser.ODataRequest | uriParser.ODataRequest[];
				if (Array.isArray(parsedRequest)) {
					request = await controlFlow.mapSeries(parsedRequest, prepareRequest);
				} else {
					request = await prepareRequest(parsedRequest);
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
								for (const { hooks } of request) {
									rollbackRequestHooks(hooks);
								}
							} else {
								rollbackRequestHooks(request.hooks);
							}
						});
						if (Array.isArray(request)) {
							const changeSetResults = new Map<number, Response>();
							const changeSetRunner = runChangeSet(req, tx);
							for (const r of request) {
								await changeSetRunner(changeSetResults, r);
							}
							return Array.from(changeSetResults.values());
						} else {
							return await runRequest(req, tx, request);
						}
					},
				);
			});

			const responses = results.map(
				(result): Response | Response[] | HttpError => {
					if (result instanceof Error) {
						return convertToHttpError(result);
					} else {
						if (
							!Array.isArray(result) &&
							result.body == null &&
							result.statusCode == null
						) {
							console.error('No status or body set', req.url, responses);
							return new InternalRequestError();
						}
						return result;
					}
				},
			);
			return responses;
		})(),
	};
};

export const getApiRoot = (req: Express.Request): string | undefined => {
	const [, apiRoot] = req.url.split('/', 2);
	return apiRoot;
};

export const handleODataRequest: Express.Handler = async (req, res, next) => {
	const apiRoot = getApiRoot(req);
	if (apiRoot == null || models[apiRoot] == null) {
		next('route');
		return;
	}

	try {
		const { tryCancelRequest, promise } = runODataRequest(req, apiRoot);

		res.on('close', tryCancelRequest);

		const responses = await promise;

		res.set('Cache-Control', 'no-cache');
		// If we are dealing with a single request unpack the response and respond normally
		if (req.batch == null || req.batch.length === 0) {
			let [response] = responses;
			if (response instanceof HttpError) {
				response = httpErrorToResponse(response);
			}
			handleResponse(res, response as Response);

			// Otherwise its a multipart request and we reply with the appropriate multipart response
		} else {
			(res.status(200) as any).sendMulti(
				responses.map((response) => {
					if (response instanceof HttpError) {
						return httpErrorToResponse(response);
					} else {
						return response;
					}
				}),
			);
		}
	} catch (e: any) {
		if (handleHttpErrors(req, res, e)) {
			return;
		}
		// If an error bubbles here it must have happened in the last then block
		// We just respond with 500 as there is probably not much we can do to recover
		console.error('An error occurred while constructing the response', e);
		res.status(500).end();
	}
};

const handleErrorFns: Array<(req: Express.Request, err: HttpError) => void> =
	[];
export const onHandleHttpError = (fn: (typeof handleErrorFns)[number]) => {
	handleErrorFns.push(fn);
};
export const handleHttpErrors = (
	req: Express.Request,
	res: Express.Response,
	err: Error,
): boolean => {
	if (err instanceof HttpError) {
		for (const handleErrorFn of handleErrorFns) {
			handleErrorFn(req, err);
		}
		const response = httpErrorToResponse(err);
		handleResponse(res, response);
		return true;
	}
	return false;
};
const handleResponse = (res: Express.Response, response: Response): void => {
	const { body, headers, statusCode } = response;
	res.set(headers);
	res.status(statusCode);
	if (!body) {
		res.end();
	} else {
		res.json(body);
	}
};

const httpErrorToResponse = (
	err: HttpError,
): RequiredField<Response, 'statusCode'> => {
	return {
		statusCode: err.status,
		body: err.getResponseBody(),
		headers: err.headers,
	};
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
		err instanceof db.DatabaseError
	) {
		return new InternalRequestError();
	}

	console.error('Unexpected response error type', err);
	return new InternalRequestError();
};

const runRequest = async (
	req: Express.Request,
	tx: Db.Tx,
	request: uriParser.ODataRequest,
): Promise<Response> => {
	const log = logger[request.vocabulary];

	if (env.DEBUG) {
		log.log('Running', req.method, req.url);
	}
	let resultGet: Db.Result | undefined;
	let resultPost: number | undefined;

	try {
		try {
			// Forward each request to the correct method handler
			await runHooks('PRERUN', request.hooks, { req, request, tx });

			switch (request.method) {
				case 'GET':
					resultGet = await runGet(req, request, tx);
					break;
				case 'POST':
					resultPost = await runPost(req, request, tx);
					break;
				case 'PUT':
				case 'PATCH':
				case 'MERGE':
					await runPut(req, request, tx);
					break;
				case 'DELETE':
					await runDelete(req, request, tx);
					break;
			}
		} catch (err: any) {
			if (err instanceof db.DatabaseError) {
				prettifyConstraintError(err, request);
				log.error(err);
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
				log.error(err);
				throw new InternalRequestError();
			}
			throw err;
		}

		await runHooks('POSTRUN', request.hooks, {
			req,
			request,
			result: resultGet ?? resultPost,
			tx,
		});
	} catch (err: any) {
		await runHooks('POSTRUN-ERROR', request.hooks, {
			req,
			request,
			tx,
			error: err,
		});
		throw err;
	}

	switch (request.method) {
		case 'GET':
			return await respondGet(req, request, resultGet, tx);
		case 'POST':
			return await respondPost(req, request, resultPost, tx);
		case 'PUT':
		case 'PATCH':
		case 'MERGE':
			return await respondPut(req, request, tx);
		case 'DELETE':
			return await respondDelete(req, request, tx);
		case 'OPTIONS':
			return await respondOptions(req, request, tx);
		default:
			throw new MethodNotAllowedError();
	}
};

const runChangeSet =
	(req: Express.Request, tx: Db.Tx) =>
	async (
		changeSetResults: Map<number, Response>,
		request: uriParser.ODataRequest,
	): Promise<void> => {
		request = updateBinds(changeSetResults, request);
		const result = await runRequest(req, tx, request);
		if (request.id == null) {
			throw new Error('No request id');
		}
		result.headers ??= {};
		result.headers['content-id'] = request.id;
		changeSetResults.set(request.id, result);
	};

// Requests inside a changeset may refer to resources created inside the
// changeset, the generation of the sql query for those requests must be
// deferred untill the request they reference is run and returns an insert ID.
// This function compiles the sql query of a request which has been deferred
const updateBinds = (
	changeSetResults: Map<number, Response>,
	request: uriParser.ODataRequest,
) => {
	if (request._defer) {
		for (let i = 0; i < request.odataBinds.length; i++) {
			const [tag, id] = request.odataBinds[i];
			if (tag === 'ContentReference') {
				const ref = changeSetResults.get(id);
				if (
					ref?.body == null ||
					typeof ref.body === 'string' ||
					ref.body.id === undefined
				) {
					throw new BadRequestError(
						'Reference to a non existing resource in Changeset',
					);
				}
				request.odataBinds[i] = uriParser.parseId(ref.body.id);
			}
		}
	}
	return request;
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
	return hooks.every(([, versionedHooks]) =>
		Object.values(versionedHooks).every((hookTypeHooks) => {
			return (
				hookTypeHooks == null || hookTypeHooks.every((hook) => hook.readOnlyTx)
			);
		}),
	);
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
	addReturning = false,
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

	if (env.DEBUG) {
		logger[vocabulary].log(query, values);
	}

	// We only add the returning clause if it's been requested and `affectedIds` hasn't been populated yet
	const returningIdField =
		addReturning && request.affectedIds == null ? getIdField(request) : false;

	const sqlResult = await tx.executeSql(query, values, returningIdField);

	if (returningIdField) {
		request.affectedIds ??= sqlResult.rows.map((row) => row[returningIdField]);
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
	request: uriParser.ODataRequest,
	result: Db.Result | undefined,
	tx: Db.Tx,
): Promise<Response> => {
	const vocab = request.vocabulary;
	if (request.sqlQuery != null) {
		if (result == null) {
			// This shouldn't be able to happen because the result should only be null if there's no sqlQuery
			throw new Error(
				'Null result passed to respond GET that has a sqlQuery defined',
			);
		}
		const format = request.odataQuery.options?.$format;
		const metadata =
			format != null && typeof format === 'object'
				? format.metadata
				: undefined;
		const d = await odataResponse.process(
			vocab,
			getAbstractSqlModel(request),
			request.originalResourceName,
			result.rows,
			{ includeMetadata: metadata === 'full' },
		);

		const response = {
			statusCode: 200,
			body: { d },
			headers: { 'content-type': 'application/json' },
		};
		await runHooks('PRERESPOND', request.hooks, {
			req,
			request,
			result,
			response,
			tx,
		});
		return response;
	} else {
		if (request.resourceName === '$metadata') {
			const permLookup = await permissions.getReqPermissions(req);
			const spec = generateODataMetadata(
				vocab,
				models[vocab].abstractSql,
				permLookup,
			);
			return {
				statusCode: 200,
				body: spec,
				headers: { 'content-type': 'application/json' },
			};
		} else if (request.resourceName === 'openapi.json') {
			// https://docs.oasis-open.org/odata/odata-openapi/v1.0/cn01/odata-openapi-v1.0-cn01.html#sec_ProvidingOASDocumentsforanODataServi
			// Following the OASIS OData to openapi translation guide the openapi.json is an independent resource
			const permLookup = await permissions.getReqPermissions(req);
			const spec = generateODataMetadata(
				vocab,
				models[vocab].abstractSql,
				permLookup,
			);
			const openApispec = generateODataMetadataAsOpenApi(
				spec,
				req.originalUrl.replace('openapi.json', ''),
				req.hostname,
			);
			return {
				statusCode: 200,
				body: openApispec,
				headers: { 'content-type': 'application/json' },
			};
		} else {
			// TODO: request.resourceName can be '$serviceroot' or a resource and we should return an odata xml document based on that
			return {
				statusCode: 404,
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
		true,
	);
	if (rowsAffected === 0) {
		throw new PermissionError();
	}
	await validateModel(tx, request.translateVersions.at(-1)!, request);

	return insertId;
};

const respondPost = async (
	req: Express.Request,
	request: uriParser.ODataRequest,
	id: number | undefined,
	tx: Db.Tx,
): Promise<Response> => {
	const vocab = request.vocabulary;
	const location = odataResponse.resourceURI(
		vocab,
		request.originalResourceName,
		id,
	);
	if (env.DEBUG) {
		logger[vocab].log('Insert ID: ', request.resourceName, id);
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

	const response = {
		statusCode: 201,
		body: result.d[0],
		headers: {
			'content-type': 'application/json',
			location,
		},
	};
	await runHooks('PRERESPOND', request.hooks, {
		req,
		request,
		result,
		response,
		tx,
	});

	return response;
};

const runPut = async (
	_req: Express.Request,
	request: uriParser.ODataRequest,
	tx: Db.Tx,
): Promise<void> => {
	let rowsAffected: number;
	// If request.sqlQuery is an array it means it's an UPSERT, ie two queries: [InsertQuery, UpdateQuery]
	if (Array.isArray(request.sqlQuery)) {
		// Run the update query first
		({ rowsAffected } = await runQuery(tx, request, 1, true));
		if (rowsAffected === 0) {
			// Then run the insert query if nothing was updated
			({ rowsAffected } = await runQuery(tx, request, 0, true));
		}
	} else {
		({ rowsAffected } = await runQuery(tx, request, undefined, true));
	}
	if (rowsAffected > 0) {
		await validateModel(tx, request.translateVersions.at(-1)!, request);
	}
};

const respondPut = async (
	req: Express.Request,
	request: uriParser.ODataRequest,
	tx: Db.Tx,
): Promise<Response> => {
	const response = {
		statusCode: 200,
	};
	await runHooks('PRERESPOND', request.hooks, {
		req,
		request,
		response,
		tx,
	});
	return response;
};
const respondDelete = respondPut;
const respondOptions = respondPut;

const runDelete = async (
	_req: Express.Request,
	request: uriParser.ODataRequest,
	tx: Db.Tx,
): Promise<void> => {
	const { rowsAffected } = await runQuery(tx, request, undefined, true);
	if (rowsAffected > 0) {
		await validateModel(tx, request.translateVersions.at(-1)!, request);
	}
};

export interface API {
	[devModelConfig.apiRoot]: PinejsClient<DevModel>;
}
const devModelConfig = {
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
		'15.0.0-data-types': async ($tx, sbvrUtils) => {
			switch (sbvrUtils.db.engine) {
				case 'mysql':
					await $tx.executeSql(`\
						ALTER TABLE "model"
						MODIFY "model value" JSON NOT NULL;

						UPDATE "model"
						SET "model value" = CAST('{"value":' || CAST("model value" AS CHAR) || '}' AS JSON)
						WHERE "model type" IN ('se', 'odataMetadata')
						AND CAST("model value" AS CHAR) LIKE '"%';`);
					break;
				case 'postgres':
					await $tx.executeSql(`\
						ALTER TABLE "model"
						ALTER COLUMN "model value" SET DATA TYPE JSONB USING "model value"::JSONB;

						UPDATE "model"
						SET "model value" = CAST('{"value":' || CAST("model value" AS TEXT) || '}' AS JSON)
						WHERE "model type" IN ('se', 'odataMetadata')
						AND CAST("model value" AS TEXT) LIKE '"%';`);
					break;
				// No need to migrate for websql
			}
		},
	},
} as const satisfies ExecutableModel;
const executeStandardModels = async (tx: Db.Tx): Promise<void> => {
	try {
		// dev model must run first
		await executeModel(tx, devModelConfig);
		await executeModels(tx, permissions.config.models);
		console.info('Successfully executed standard models.');
	} catch (err: any) {
		console.error('Failed to execute standard models.', err);
		throw err;
	}
};

export const setup = async (
	_app: Express.Application,
	$db: Db.Database,
): Promise<void> => {
	db = $db;
	try {
		await db.transaction(async (tx) => {
			await executeStandardModels(tx);
			permissions.setup();
		});
	} catch (err: any) {
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

export const postSetup = async (
	_app: Express.Application,
	$db: Db.Database,
): Promise<void> => {
	db = $db;
	try {
		await db.transaction(async (tx) => {
			await postExecuteModels(tx);
		});
	} catch (err: any) {
		console.error('Could not post execute models', err);
		process.exit(1);
	}
};

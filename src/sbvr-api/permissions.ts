import * as _ from 'lodash';
import * as Promise from 'bluebird';
import * as env from '../config-loader/env';
// tslint:disable-next-line:no-var-requires
const userModel: string = require('./user.sbvr');
import {
	metadataEndpoints,
	memoizedParseOdata,
	ODataRequest,
} from './uri-parser';
import {
	BadRequestError,
	PermissionError,
	PermissionParsingError,
} from './errors';
import * as ODataParser from '@resin/odata-parser';
import * as memoize from 'memoizee';
import memoizeWeak = require('memoizee/weak');
import {
	sqlNameToODataName,
	ODataBinds,
	ODataQuery,
	SupportedMethod,
	Definition,
} from '@resin/odata-to-abstract-sql';
import * as express from 'express';
import {
	AbstractSqlModel,
	Relationship,
	SelectNode,
	AbstractSqlType,
	AliasNode,
} from '@resin/abstract-sql-compiler';
import { HookReq, User, ApiKey, AnyObject } from './sbvr-utils';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import * as uriParser from './uri-parser';
import { PinejsClientCoreFactory } from 'pinejs-client-core';

const DEFAULT_ACTOR_BIND = '@__ACTOR_ID';
const DEFAULT_ACTOR_BIND_REGEX = new RegExp(
	_.escapeRegExp(DEFAULT_ACTOR_BIND),
	'g',
);

export { PermissionError, PermissionParsingError };
export type PermissionReq = {
	user?: User;
	apiKey?: ApiKey;
};
export const root: PermissionReq = {
	user: {
		id: 0,
		actor: 0,
		permissions: ['resource.all'],
	},
};
export const rootRead: PermissionReq = {
	user: {
		id: 0,
		actor: 0,
		permissions: ['resource.get'],
	},
};

interface NestedCheckOr<T> {
	or: NestedCheckArray<T>;
}
interface NestedCheckAnd<T> {
	and: NestedCheckArray<T>;
}
interface NestedCheckArray<T> extends Array<NestedCheck<T>> {}
type NestedCheck<T> =
	| NestedCheckOr<T>
	| NestedCheckAnd<T>
	| NestedCheckArray<T>
	| T;
type PermissionCheck = NestedCheck<string>;

type MappedType<I, O> = O extends NestedCheck<infer T>
	? Exclude<Exclude<I, string> | T, boolean>
	: Exclude<Exclude<I, string> | O, boolean>;
type MappedNestedCheck<
	T extends NestedCheck<I>,
	I,
	O
> = T extends NestedCheckOr<I>
	? NestedCheckOr<MappedType<I, O>>
	: T extends NestedCheckAnd<I>
	? NestedCheckAnd<MappedType<I, O>>
	: T extends NestedCheckArray<I>
	? NestedCheckArray<MappedType<I, O>>
	: Exclude<I, string> | O;

const methodPermissions: {
	[method in Exclude<SupportedMethod, 'OPTIONS'>]: PermissionCheck
} & { OPTIONS?: PermissionCheck } = {
	GET: {
		or: ['get', 'read'],
	},
	PUT: {
		or: [
			'set',
			{
				and: ['create', 'update'],
			},
		],
	},
	POST: {
		or: ['set', 'create'],
	},
	PATCH: {
		or: ['set', 'update'],
	},
	MERGE: {
		or: ['set', 'update'],
	},
	DELETE: 'delete',
};

const $parsePermissions = memoize(
	(filter: string) => {
		const { tree, binds } = ODataParser.parse(filter, {
			startRule: 'ProcessRule',
			rule: 'FilterByExpression',
		});
		return {
			tree,
			extraBinds: binds,
		};
	},
	{
		primitive: true,
		max: env.cache.parsePermissions.max,
	},
);

const rewriteBinds = (
	{ tree, extraBinds }: { tree: ODataQuery; extraBinds: ODataBinds },
	odataBinds: ODataBinds,
): ODataQuery => {
	// Add the extra binds we parsed onto our existing list of binds vars.
	const bindsLength = odataBinds.length;
	odataBinds.push(...extraBinds);
	// Clone the tree so the cached version can't be mutated and at the same time fix the bind numbers
	return _.cloneDeepWith(tree, value => {
		if (value != null) {
			const bind = value.bind;
			if (_.isInteger(bind)) {
				return { bind: value.bind + bindsLength };
			}
		}
	});
};

const parsePermissions = (
	filter: string,
	odataBinds: ODataBinds,
): ODataQuery => {
	const odata = $parsePermissions(filter);
	return rewriteBinds(odata, odataBinds);
};

// Traverses all values in `check`, actions for the following data types:
// string: Calls `stringCallback` and uses the value returned instead
// boolean: Used as-is
// array: Treated as an AND of all elements
// object: Must have only one key of either `AND` or `OR`, with an array value that will be treated according to the key.
const isAnd = <T>(x: any): x is NestedCheckAnd<T> =>
	_.isObject(x) && 'and' in x;
const isOr = <T>(x: any): x is NestedCheckOr<T> => _.isObject(x) && 'or' in x;
export function nestedCheck<I, O>(
	check: string,
	stringCallback: (s: string) => O,
): O;
export function nestedCheck<I, O>(
	check: boolean,
	stringCallback: (s: string) => O,
): boolean;
export function nestedCheck<I, O>(
	check: NestedCheck<I>,
	stringCallback: (s: string) => O,
): Exclude<I, string> | O | MappedNestedCheck<typeof check, I, O>;
export function nestedCheck<I, O>(
	check: NestedCheck<I>,
	stringCallback: (s: string) => O,
): boolean | Exclude<I, string> | O | MappedNestedCheck<typeof check, I, O> {
	if (_.isString(check)) {
		return stringCallback(check);
	}
	if (_.isBoolean(check)) {
		return check;
	}
	if (_.isArray(check)) {
		let results: any[] = [];
		for (const subcheck of check) {
			const result = nestedCheck(subcheck, stringCallback);
			if (_.isBoolean(result)) {
				if (result === false) {
					return false;
				}
			} else if (isAnd(result)) {
				results = results.concat(result.and);
			} else {
				results.push(result);
			}
		}
		if (results.length === 1) {
			return results[0];
		}
		if (results.length > 1) {
			return {
				and: _.uniq(results),
			};
		}
		return true;
	}
	if (_.isObject(check)) {
		const checkTypes = _.keys(check);
		if (checkTypes.length > 1) {
			throw new Error('More than one check type: ' + checkTypes);
		}
		const checkType = checkTypes[0];
		switch (checkType.toUpperCase()) {
			case 'AND':
				const and = (check as NestedCheckAnd<I>)[checkType as 'and'];
				return nestedCheck(and, stringCallback);
			case 'OR':
				const or = (check as NestedCheckOr<I>)[checkType as 'or'];
				let results: any[] = [];
				for (const subcheck of or) {
					const result = nestedCheck(subcheck, stringCallback);
					if (_.isBoolean(result)) {
						if (result === true) {
							return true;
						}
					} else if (isOr(result)) {
						results = results.concat(result.or);
					} else {
						results.push(result);
					}
				}
				if (results.length === 1) {
					return results[0];
				}
				if (results.length > 1) {
					return {
						or: _.uniq(results),
					};
				}
				return false;
			default:
				throw new Error('Cannot parse required checking logic: ' + checkType);
		}
	}
	throw new Error('Cannot parse required checks: ' + check);
}

const collapsePermissionFilters = <T>(
	v: NestedCheck<{ filter: T }>,
): T | [string, T] => {
	if (_.isArray(v)) {
		return collapsePermissionFilters({ or: v });
	}
	if (typeof v === 'object') {
		if ('filter' in v) {
			return v.filter;
		}
		return _(v)
			.toPairs()
			.flattenDeep()
			.map(collapsePermissionFilters)
			.value() as [string, T];
	}
	return v;
};

const namespaceRelationships = (
	relationships: Relationship,
	alias: string,
): void => {
	_.each(relationships, (relationship: Relationship, key) => {
		if (key === '$') {
			return;
		}

		let mapping = relationship.$;
		if (mapping != null && mapping.length === 2) {
			mapping = _.cloneDeep(mapping);
			mapping[1][0] = `${mapping[1][0]}$${alias}`;
			relationships[`${key}$${alias}`] = {
				$: mapping,
			};
		}
		namespaceRelationships(relationship, alias);
	});
};

type PermissionLookup = _.Dictionary<true | string[]>;

const getPermissionsLookup = memoize(
	(permissions: string[]): PermissionLookup => {
		const permissionsLookup: PermissionLookup = {};
		for (const permission of permissions) {
			const [target, condition] = permission.split('?');
			if (condition == null) {
				// We have unconditional permission
				permissionsLookup[target] = true;
			} else if (permissionsLookup[target] !== true) {
				if (permissionsLookup[target] == null) {
					permissionsLookup[target] = [];
				}
				(permissionsLookup[target] as Exclude<
					PermissionLookup[typeof target],
					true
				>).push(condition);
			}
		}
		return permissionsLookup;
	},
	{
		primitive: true,
		max: env.cache.permissionsLookup.max,
	},
);

const $checkPermissions = (
	permissionsLookup: PermissionLookup,
	actionList: PermissionCheck,
	vocabulary?: string,
	resourceName?: string,
): boolean | NestedCheck<string> => {
	const checkObject: PermissionCheck = {
		or: ['all', actionList],
	};
	return nestedCheck(
		checkObject,
		(permissionCheck): boolean | string | NestedCheckOr<string> => {
			const resourcePermission =
				permissionsLookup['resource.' + permissionCheck];
			let vocabularyPermission: string[] | undefined;
			let vocabularyResourcePermission: string[] | undefined;
			if (resourcePermission === true) {
				return true;
			}
			if (vocabulary != null) {
				const maybeVocabularyPermission =
					permissionsLookup[vocabulary + '.' + permissionCheck];
				if (maybeVocabularyPermission === true) {
					return true;
				}
				vocabularyPermission = maybeVocabularyPermission;
				if (resourceName != null) {
					const maybeVocabularyResourcePermission =
						permissionsLookup[
							vocabulary + '.' + resourceName + '.' + permissionCheck
						];
					if (maybeVocabularyResourcePermission === true) {
						return true;
					}
					vocabularyResourcePermission = maybeVocabularyResourcePermission;
				}
			}

			// Get the unique permission set, ignoring undefined sets.
			const conditionalPermissions = _.union(
				resourcePermission,
				vocabularyPermission,
				vocabularyResourcePermission,
			);

			if (conditionalPermissions.length === 1) {
				return conditionalPermissions[0];
			}
			if (conditionalPermissions.length > 1) {
				return {
					or: conditionalPermissions,
				};
			}
			return false;
		},
	);
};

const generateConstrainedAbstractSql = (
	permissionsLookup: PermissionLookup,
	actionList: PermissionCheck,
	vocabulary: string,
	resourceName: string,
) => {
	const conditionalPerms = $checkPermissions(
		permissionsLookup,
		actionList,
		vocabulary,
		resourceName,
	);
	if (conditionalPerms === false) {
		throw new PermissionError();
	}
	if (conditionalPerms === true) {
		// If we have full access then no need to provide a constrained definition
		return false;
	}

	const odata = memoizedParseOdata(`/${resourceName}`);

	const permissionFilters = nestedCheck(conditionalPerms, permissionCheck => {
		try {
			// We use an object with filter key to avoid collapsing our filters later.
			return {
				filter: parsePermissions(permissionCheck, odata.binds),
			};
		} catch (e) {
			console.warn(
				'Failed to parse conditional permissions: ',
				permissionCheck,
			);
			throw new PermissionParsingError(e);
		}
	});

	const collapsedPermissionFilters = collapsePermissionFilters(
		permissionFilters,
	);
	_.set(odata, ['tree', 'options', '$filter'], collapsedPermissionFilters);

	let { odataBinds, abstractSqlQuery } = uriParser.translateUri({
		method: 'GET',
		resourceName,
		vocabulary,
		odataBinds: odata.binds,
		odataQuery: odata.tree,
		values: {},
	});
	abstractSqlQuery = _.clone(abstractSqlQuery!);
	// Remove aliases from the top level select
	const selectIndex = _.findIndex(abstractSqlQuery, v => v[0] === 'Select');
	const select = (abstractSqlQuery[selectIndex] = _.clone(
		abstractSqlQuery[selectIndex],
	)) as SelectNode;
	select[1] = _.map(
		select[1],
		(selectField): AbstractSqlType => {
			if (selectField[0] === 'Alias') {
				return (selectField as AliasNode<any>)[1];
			}
			if (selectField.length === 2 && _.isArray(selectField[0])) {
				return selectField[0];
			}
			return selectField;
		},
	);

	return { extraBinds: odataBinds, abstractSqlQuery };
};

// Call the function once and either return the same result or throw the same error on subsequent calls
const onceGetter = (obj: AnyObject, propName: string, fn: () => any) => {
	// We have `nullableFn` to keep fn required but still allow us to clear the fn reference
	// after we have called fn
	let nullableFn: undefined | typeof fn = fn;
	let thrownErr: Error | undefined = undefined;
	Object.defineProperty(obj, propName, {
		enumerable: true,
		configurable: true,
		get() {
			if (thrownErr != null) {
				throw thrownErr;
			}
			try {
				const result = nullableFn!();
				// We need the delete first as the current property is read-only
				// and the delete removes that restriction
				delete this[propName];
				return (this[propName] = result);
			} catch (e) {
				thrownErr = e;
				throw thrownErr;
			} finally {
				nullableFn = undefined;
			}
		},
	});
};

const deepFreezeExceptDefinition = (obj: AnyObject) => {
	Object.freeze(obj);

	Object.getOwnPropertyNames(obj).forEach(prop => {
		// We skip the definition because we know it's a property we've defined that will throw an error in some cases
		if (
			prop !== 'definition' &&
			obj.hasOwnProperty(prop) &&
			obj[prop] !== null &&
			!_.includes(['object', 'function'], typeof obj[prop])
		) {
			deepFreezeExceptDefinition(obj);
		}
	});
};

const createBypassDefinition = (definition: Definition) =>
	_.cloneDeepWith(definition, abstractSql => {
		if (
			_.isArray(abstractSql) &&
			abstractSql[0] === 'Resource' &&
			!abstractSql[1].endsWith('$bypass')
		) {
			return ['Resource', `${abstractSql[1]}$bypass`];
		}
	});

const getAlias = (name: string) => {
	// TODO-MAJOR: Change $bypass to $permissionbypass or similar
	if (name.endsWith('$bypass')) {
		return 'bypass';
	}
	const [, permissionsJSON] = name.split('permissions');
	if (!permissionsJSON) {
		return;
	}
	return `permissions${permissionsJSON}`;
};
const stringifiedGetPermissions = JSON.stringify(methodPermissions.GET);
const getBoundConstrainedMemoizer = memoizeWeak(
	(abstractSqlModel: AbstractSqlModel) =>
		memoizeWeak(
			(permissionsLookup: PermissionLookup, vocabulary: string) => {
				const constrainedAbstractSqlModel = _.cloneDeep(abstractSqlModel);

				const origSynonyms = Object.keys(constrainedAbstractSqlModel.synonyms);
				constrainedAbstractSqlModel.synonyms = new Proxy(
					constrainedAbstractSqlModel.synonyms,
					{
						get: (synonyms, permissionSynonym: string) => {
							if (synonyms[permissionSynonym]) {
								return synonyms[permissionSynonym];
							}
							const alias = getAlias(permissionSynonym);
							if (!alias) {
								return;
							}
							origSynonyms.forEach((canonicalForm, synonym) => {
								synonyms[`${synonym}$${alias}`] = `${canonicalForm}$${alias}`;
							});
							return synonyms[permissionSynonym];
						},
					},
				);

				const origRelationships = Object.keys(
					constrainedAbstractSqlModel.relationships,
				);
				constrainedAbstractSqlModel.relationships = new Proxy(
					constrainedAbstractSqlModel.relationships,
					{
						get: (relationships, permissionResourceName: string) => {
							if (relationships[permissionResourceName]) {
								return relationships[permissionResourceName];
							}
							const alias = getAlias(permissionResourceName);
							if (!alias) {
								return;
							}
							for (const relationship of origRelationships) {
								relationships[`${relationship}$${alias}`] =
									relationships[relationship];
								namespaceRelationships(relationships[relationship], alias);
							}
							return relationships[permissionResourceName];
						},
					},
				);

				_.each(constrainedAbstractSqlModel.tables, (table, resourceName) => {
					const bypassResourceName = `${resourceName}$bypass`;
					constrainedAbstractSqlModel.tables[bypassResourceName] = _.clone(
						table,
					);
					constrainedAbstractSqlModel.tables[
						bypassResourceName
					].resourceName = bypassResourceName;
					if (table.definition) {
						// If the table is definition based then just make the bypass version match but pointing to the equivalent bypassed resources
						constrainedAbstractSqlModel.tables[
							bypassResourceName
						].definition = createBypassDefinition(table.definition);
					} else {
						// Otherwise constrain the non-bypass table
						onceGetter(
							table,
							'definition',
							() =>
								// For $filter on eg a DELETE you need read permissions on the sub-resources,
								// you only need delete permissions on the resource being deleted
								constrainedAbstractSqlModel.tables[
									`${resourceName}$permissions${stringifiedGetPermissions}`
								].definition,
						);
					}
				});
				constrainedAbstractSqlModel.tables = new Proxy(
					constrainedAbstractSqlModel.tables,
					{
						get: (tables, permissionResourceName: string) => {
							if (tables[permissionResourceName]) {
								return tables[permissionResourceName];
							}
							const [
								resourceName,
								permissionsJSON,
							] = permissionResourceName.split('$permissions');
							if (!permissionsJSON) {
								return;
							}
							const permissions = JSON.parse(permissionsJSON);

							const table = tables[`${resourceName}$bypass`];

							const permissionsTable = (tables[
								permissionResourceName
							] = _.clone(table));
							permissionsTable.resourceName = permissionResourceName;
							onceGetter(permissionsTable, 'definition', () =>
								// For $filter on eg a DELETE you need read permissions on the sub-resources,
								// you only need delete permissions on the resource being deleted
								generateConstrainedAbstractSql(
									permissionsLookup,
									permissions,
									vocabulary,
									sqlNameToODataName(permissionsTable.name),
								),
							);
							return permissionsTable;
						},
					},
				);
				deepFreezeExceptDefinition(constrainedAbstractSqlModel);
				return constrainedAbstractSqlModel;
			},
			{
				primitive: true,
			},
		),
);
const memoizedGetConstrainedModel = (
	abstractSqlModel: AbstractSqlModel,
	permissionsLookup: PermissionLookup,
	vocabulary: string,
) =>
	getBoundConstrainedMemoizer(abstractSqlModel)(permissionsLookup, vocabulary);

export const checkPassword = (
	username: string,
	password: string,
	callback?: (err?: Error, permissions?: string[]) => void,
): Promise<{
	id: number;
	actor: number;
	username: string;
	permissions: string[];
}> => {
	const authApi = sbvrUtils.api.Auth;
	return authApi
		.get({
			resource: 'user',
			passthrough: {
				req: rootRead,
			},
			options: {
				$select: ['id', 'actor', 'password'],
				$filter: {
					username,
				},
			},
		})
		.then((result: AnyObject[]) => {
			if (result.length === 0) {
				throw new Error('User not found');
			}
			const hash = result[0].password;
			const userId = result[0].id;
			const actorId = result[0].actor;
			return sbvrUtils.sbvrTypes.Hashed.compare(password, hash).then(res => {
				if (!res) {
					throw new Error('Passwords do not match');
				}
				return getUserPermissions(userId).then(permissions => {
					return {
						id: userId,
						actor: actorId,
						username,
						permissions,
					};
				});
			});
		})
		.asCallback(callback);
};

const getPermissions = (
	permsFilter: PinejsClientCoreFactory.Filter,
): Promise<string[]> => {
	const authApi = sbvrUtils.api.Auth;
	return authApi
		.get({
			resource: 'permission',
			passthrough: {
				req: rootRead,
			},
			options: {
				$select: 'name',
				$filter: permsFilter,
				// We orderby to increase the hit rate for the `_checkPermissions` memoisation
				$orderby: {
					name: 'asc',
				},
			},
		})
		.then(
			(permissions: AnyObject[]): string[] =>
				permissions.map(permission => permission.name),
		)
		.tapCatch(err => {
			authApi.logger.error('Error loading permissions', err, err.stack);
		});
};

export const getUserPermissions = (
	userId: number,
	callback?: (err: Error | undefined, permissions: string[]) => void,
): Promise<string[]> => {
	if (_.isString(userId)) {
		userId = _.parseInt(userId);
	}
	if (!_.isFinite(userId)) {
		return Promise.reject(
			new Error('User ID has to be numeric, got: ' + typeof userId),
		);
	}
	const permsFilter = {
		$or: {
			is_of__user: {
				$any: {
					$alias: 'uhp',
					$expr: {
						uhp: { user: userId },
						$or: [
							{
								uhp: { expiry_date: null },
							},
							{
								uhp: {
									expiry_date: { $gt: { $now: null } },
								},
							},
						],
					},
				},
			},
			is_of__role: {
				$any: {
					$alias: 'rhp',
					$expr: {
						rhp: {
							role: {
								$any: {
									$alias: 'r',
									$expr: {
										r: {
											is_of__user: {
												$any: {
													$alias: 'uhr',
													$expr: {
														uhr: { user: userId },
														$or: [
															{
																uhr: { expiry_date: null },
															},
															{
																uhr: {
																	expiry_date: { $gt: { $now: null } },
																},
															},
														],
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	};
	return getPermissions(permsFilter).asCallback(callback);
};

const $getApiKeyPermissions = memoize(
	(apiKey: string) => {
		const permsFilter = {
			$or: {
				is_of__api_key: {
					$any: {
						$alias: 'khp',
						$expr: {
							khp: {
								api_key: {
									$any: {
										$alias: 'k',
										$expr: {
											k: { key: apiKey },
										},
									},
								},
							},
						},
					},
				},
				is_of__role: {
					$any: {
						$alias: 'rhp',
						$expr: {
							rhp: {
								role: {
									$any: {
										$alias: 'r',
										$expr: {
											r: {
												is_of__api_key: {
													$any: {
														$alias: 'khr',
														$expr: {
															khr: {
																api_key: {
																	$any: {
																		$alias: 'k',
																		$expr: {
																			k: { key: apiKey },
																		},
																	},
																},
															},
														},
													},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		};
		return getPermissions(permsFilter);
	},
	{
		primitive: true,
		max: env.cache.apiKeys.max,
		maxAge: env.cache.apiKeys.maxAge,
	},
);

export const getApiKeyPermissions = (
	apiKey: string,
	callback?: (err: Error | undefined, permissions: string[]) => void,
): Promise<string[]> =>
	Promise.try(() => {
		if (!_.isString(apiKey)) {
			throw new Error('API key has to be a string, got: ' + typeof apiKey);
		}
		return $getApiKeyPermissions(apiKey);
	}).asCallback(callback);

const getApiKeyActorId = memoize(
	(apiKey: string) =>
		sbvrUtils.api.Auth.get({
			resource: 'api_key',
			passthrough: {
				req: rootRead,
			},
			options: {
				$select: 'is_of__actor',
				$filter: {
					key: apiKey,
				},
			},
		}).then((apiKeys: AnyObject[]) => {
			if (apiKeys.length === 0) {
				throw new PermissionError();
			}
			const apiKeyActorID = apiKeys[0].is_of__actor.__id;
			if (apiKeyActorID == null) {
				throw new Error('API key is not linked to a actor?!');
			}
			return apiKeyActorID;
		}),
	{
		primitive: true,
		promise: true,
		maxAge: env.cache.apiKeys.maxAge,
	},
);

const checkApiKey = Promise.method((req: PermissionReq, apiKey: string) => {
	if (apiKey == null || req.apiKey != null) {
		return;
	}
	return getApiKeyPermissions(apiKey)
		.catch(err => {
			console.warn('Error with API key:', err);
			// Ignore errors getting the api key and just use an empty permissions object
			return [];
		})
		.then(permissions => {
			req.apiKey = {
				key: apiKey,
				permissions: permissions,
			};
		});
});

export const customAuthorizationMiddleware = (expectedScheme = 'Bearer') => {
	if (expectedScheme == null) {
		expectedScheme = 'Bearer';
	}
	expectedScheme = expectedScheme.toLowerCase();
	return (
		req: express.Request,
		_res?: express.Response,
		next?: express.NextFunction,
	): Promise<void> =>
		Promise.try(() => {
			const auth = req.header('Authorization');
			if (!auth) {
				return;
			}

			const parts = auth.split(' ');
			if (parts.length !== 2) {
				return;
			}

			const [scheme, apiKey] = parts;
			if (scheme.toLowerCase() !== expectedScheme) {
				return;
			}

			return checkApiKey(req, apiKey);
		}).then(() => {
			next && next();
		});
};

// A default bearer middleware for convenience
export const authorizationMiddleware = customAuthorizationMiddleware();

export const customApiKeyMiddleware = (paramName = 'apikey') => {
	if (paramName == null) {
		paramName = 'apikey';
	}
	return (
		req: HookReq | express.Request,
		_res?: express.Response,
		next?: express.NextFunction,
	): Promise<void> => {
		const apiKey =
			req.params[paramName] != null
				? req.params[paramName]
				: req.body[paramName] != null
				? req.body[paramName]
				: req.query[paramName];
		return checkApiKey(req, apiKey).then(() => {
			next && next();
		});
	};
};

// A default api key middleware for convenience
export const apiKeyMiddleware = customApiKeyMiddleware();

export const checkPermissions = (
	req: PermissionReq,
	actionList: PermissionCheck,
	resourceName?: string,
	vocabulary?: string,
) =>
	getReqPermissions(req).then(permissionsLookup =>
		$checkPermissions(permissionsLookup, actionList, vocabulary, resourceName),
	);

export const checkPermissionsMiddleware = (
	action: PermissionCheck,
): express.RequestHandler => (req, res, next) =>
	checkPermissions(req, action)
		.then(allowed => {
			switch (allowed) {
				case false:
					res.sendStatus(401);
					return;
				case true:
					next();
					return;
				default:
					throw new Error(
						'checkPermissionsMiddleware returned a conditional permission',
					);
			}
		})
		.catch(err => {
			sbvrUtils.api.Auth.logger.error(
				'Error checking permissions',
				err,
				err.stack,
			);
			res.sendStatus(503);
		});

const getGuestPermissions = memoize(
	() =>
		// Get guest user
		sbvrUtils.api.Auth.get({
			resource: 'user',
			passthrough: {
				req: rootRead,
			},
			options: {
				$select: 'id',
				$filter: {
					username: 'guest',
				},
			},
		})
			.then((result: AnyObject[]) => {
				if (result.length === 0) {
					throw new Error('No guest user');
				}
				return getUserPermissions(result[0].id);
			})
			.then(_.uniq),
	{ promise: true },
);

const getReqPermissions = (req: PermissionReq, odataBinds: ODataBinds = []) =>
	Promise.join(
		getGuestPermissions(),
		Promise.try(() => {
			if (
				req.apiKey != null &&
				req.apiKey.permissions != null &&
				req.apiKey.permissions.length > 0
			) {
				return getApiKeyActorId(req.apiKey.key);
			}
		}),
		(guestPermissions, apiKeyActorID) => {
			if (_.some(guestPermissions, p => DEFAULT_ACTOR_BIND_REGEX.test(p))) {
				throw new Error('Guest permissions cannot reference actors');
			}

			let permissions = guestPermissions;

			let actorIndex = 0;
			const addActorPermissions = (
				actorId: number,
				actorPermissions: string[],
			) => {
				let actorBind = DEFAULT_ACTOR_BIND;
				if (actorIndex > 0) {
					actorBind += actorIndex;
					actorPermissions = _.map(actorPermissions, actorPermission =>
						actorPermission.replace(DEFAULT_ACTOR_BIND_REGEX, actorBind),
					);
				}
				odataBinds[actorBind] = ['Real', actorId];
				actorIndex++;
				permissions = permissions.concat(actorPermissions);
			};

			if (req.user != null && req.user.permissions != null) {
				addActorPermissions(req.user.actor, req.user.permissions);
			}
			if (req.apiKey != null && req.apiKey.permissions != null) {
				addActorPermissions(apiKeyActorID, req.apiKey.permissions);
			}

			permissions = _.uniq(permissions);

			return getPermissionsLookup(permissions);
		},
	);

const resolveSubRequest = (
	request: Pick<
		ODataRequest,
		'abstractSqlModel' | 'vocabulary' | 'resourceName'
	>,
	lambda: _.Dictionary<string>,
	propertyName: string,
	v: { name?: string },
): Pick<ODataRequest, 'abstractSqlModel' | 'vocabulary' | 'resourceName'> => {
	if (lambda[propertyName] == null) {
		v.name = `${propertyName}$bypass`;
	}
	const newResourceName =
		lambda[propertyName] != null
			? lambda[propertyName]
			: sbvrUtils.resolveNavigationResource(request, propertyName);
	return {
		abstractSqlModel: request.abstractSqlModel,
		vocabulary: request.vocabulary,
		resourceName: newResourceName,
	};
};

const rewriteODataOptions = (
	request: Pick<
		ODataRequest,
		'abstractSqlModel' | 'vocabulary' | 'resourceName'
	>,
	data: AnyObject | any[],
	lambda: _.Dictionary<string> = {},
) => {
	_.each(data, (v: any) => {
		if (_.isArray(v)) {
			rewriteODataOptions(request, v, lambda);
		} else if (_.isObject(v)) {
			const propertyName = v.name;
			if (propertyName != null) {
				if (v.lambda != null) {
					const newLambda = _.clone(lambda);
					newLambda[v.lambda.identifier] = sbvrUtils.resolveNavigationResource(
						request,
						propertyName,
					);
					// TODO: This should actually use the top level resource context,
					// however odata-to-abstract-sql is bugged so we use the lambda context to match that bug for now
					const subRequest = resolveSubRequest(
						request,
						lambda,
						propertyName,
						v,
					);
					rewriteODataOptions(subRequest, v, newLambda);
				} else if (v.options != null) {
					_.each(v.options, option => {
						const subRequest = resolveSubRequest(
							request,
							lambda,
							propertyName,
							v,
						);
						rewriteODataOptions(subRequest, option, lambda);
					});
				} else if (v.property != null) {
					const subRequest = resolveSubRequest(
						request,
						lambda,
						propertyName,
						v,
					);
					rewriteODataOptions(subRequest, v, lambda);
				} else {
					rewriteODataOptions(request, v, lambda);
				}
			} else {
				rewriteODataOptions(request, v, lambda);
			}
		}
	});
};

export const addPermissions = Promise.method(
	(
		req: PermissionReq,
		request: ODataRequest & { permissionType?: PermissionCheck },
	): Promise<void> => {
		const { vocabulary, resourceName, odataQuery, odataBinds } = request;
		let { method, permissionType: maybePermissionType } = request;
		let abstractSqlModel = sbvrUtils.getAbstractSqlModel(request);
		method = method.toUpperCase() as SupportedMethod;
		const isMetadataEndpoint =
			_.includes(metadataEndpoints, resourceName) || method === 'OPTIONS';

		let permissionType: PermissionCheck;
		if (maybePermissionType != null) {
			permissionType = maybePermissionType;
		} else if (isMetadataEndpoint) {
			permissionType = 'model';
		} else {
			const methodPermission = methodPermissions[method];
			if (methodPermission != null) {
				permissionType = methodPermission;
			} else {
				console.warn('Unknown method for permissions type check: ', method);
				permissionType = 'all';
			}
		}

		// This bypasses in the root cases, needed for fetching guest permissions to work, it can almost certainly be done better though
		let permissions = req.user == null ? [] : req.user.permissions || [];
		permissions = permissions.concat(
			req.apiKey == null ? [] : req.apiKey.permissions || [],
		);
		if (
			permissions.length > 0 &&
			$checkPermissions(
				getPermissionsLookup(permissions),
				permissionType,
				vocabulary,
			) === true
		) {
			// We have unconditional permission to access the vocab so there's no need to intercept anything
			return Promise.resolve();
		}
		return getReqPermissions(req, odataBinds).then(permissionsLookup => {
			// Update the request's abstract sql model to use the constrained version
			request.abstractSqlModel = abstractSqlModel = memoizedGetConstrainedModel(
				abstractSqlModel,
				permissionsLookup,
				vocabulary,
			);

			if (!_.isEqual(permissionType, methodPermissions.GET)) {
				const sqlName = sbvrUtils.resolveSynonym(request);
				odataQuery.resource = `${sqlName}$permissions${JSON.stringify(
					permissionType,
				)}`;
			}
		});
	},
);

export const config = {
	models: [
		{
			apiRoot: 'Auth',
			modelText: userModel,
			customServerCode: exports,
		},
	],
};
export const setup = () => {
	sbvrUtils.addPureHook('all', 'all', 'all', {
		PREPARSE: ({ req }) => apiKeyMiddleware(req),
		POSTPARSE: ({
			req,
			request,
		}: {
			req: HookReq;
			request: ODataRequest & { permissionType?: PermissionCheck };
		}) => {
			// If the abstract sql query is already generated then adding permissions will do nothing
			if (request.abstractSqlQuery != null) {
				return;
			}
			if (
				request.method === 'POST' &&
				request.odataQuery.property != null &&
				request.odataQuery.property.resource === 'canAccess'
			) {
				if (request.odataQuery.key == null) {
					throw new BadRequestError();
				}
				const { action, method } = request.values;
				if ((method == null) === (action == null)) {
					// Exactly one of method or action are allowed
					throw new BadRequestError();
				}
				if (method != null) {
					const permissions = methodPermissions[method as SupportedMethod];
					if (permissions == null) {
						throw new BadRequestError();
					}
					request.permissionType = permissions;
				} else {
					request.permissionType = action;
				}

				const abstractSqlModel = sbvrUtils.getAbstractSqlModel(request);
				request.resourceName = request.resourceName.slice(
					0,
					-'#canAccess'.length,
				);
				const resourceName = sbvrUtils.resolveSynonym(request);
				const resourceTable = abstractSqlModel.tables[resourceName];
				if (resourceTable == null) {
					throw new Error('Unknown resource: ' + request.resourceName);
				}
				const idField = resourceTable.idField;
				request.odataQuery.options = {
					$select: { properties: [{ name: idField }] },
					$top: 1,
				};
				request.odataQuery.resource = request.resourceName;
				delete request.odataQuery.property;
				request.method = 'GET';
				request.custom.isAction = 'canAccess';
			}
			return addPermissions(req, request);
		},
		PRERESPOND: ({ request, data }) => {
			if (request.custom.isAction === 'canAccess') {
				if (_.isEmpty(data)) {
					// If the caller does not have any permissions to access the
					// resource pine will throw a PermissionError. To have the
					// same behavior for the case that the user has permissions
					// to access the resource, but not this instance we also
					// throw a PermissionError if the result is empty.
					throw new PermissionError();
				}
			}
		},
	});

	sbvrUtils.addPureHook('POST', 'Auth', 'user', {
		POSTPARSE: ({ request, api }) =>
			api
				.post({
					resource: 'actor',
					options: { returnResource: false },
				})
				.then((result: AnyObject) => {
					request.values.actor = result.id;
				}),
	});

	sbvrUtils.addPureHook('DELETE', 'Auth', 'user', {
		POSTRUN: ({ request, api }) =>
			api.delete({
				resource: 'actor',
				id: request.values.actor,
			}),
	});
};

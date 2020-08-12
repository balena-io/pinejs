import type {
	AbstractSqlModel,
	AbstractSqlType,
	AliasNode,
	Relationship,
	RelationshipMapping,
	SelectNode,
} from '@balena/abstract-sql-compiler';
import type * as Express from 'express';
import type {
	ODataBinds,
	ODataQuery,
	SupportedMethod,
} from '@balena/odata-parser';
import type { ApiKey, HookReq, User } from '../sbvr-api/sbvr-utils';
import type { AnyObject } from './common-types';

import {
	Definition,
	OData2AbstractSQL,
	odataNameToSqlName,
	ResourceFunction,
	sqlNameToODataName,
} from '@balena/odata-to-abstract-sql';
import * as ODataParser from '@balena/odata-parser';

import * as _ from 'lodash';
import * as memoize from 'memoizee';
import * as randomstring from 'randomstring';
import * as env from '../config-loader/env';
import * as sbvrUtils from '../sbvr-api/sbvr-utils';
import {
	BadRequestError,
	PermissionError,
	PermissionParsingError,
} from './errors';
import {
	memoizedGetOData2AbstractSQL,
	memoizedParseOdata,
	metadataEndpoints,
	ODataRequest,
} from './uri-parser';
import memoizeWeak = require('memoizee/weak');

// tslint:disable-next-line:no-var-requires
const userModel: string = require('./user.sbvr');

const DEFAULT_ACTOR_BIND = '@__ACTOR_ID';
const DEFAULT_ACTOR_BIND_REGEX = new RegExp(
	_.escapeRegExp(DEFAULT_ACTOR_BIND),
	'g',
);

export { PermissionError, PermissionParsingError };
export interface PermissionReq {
	user?: User;
	apiKey?: ApiKey;
}
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
	[method in Exclude<SupportedMethod, 'OPTIONS'>]: PermissionCheck;
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
	return _.cloneDeepWith(tree, (value) => {
		if (value != null) {
			const bind = value.bind;
			if (Number.isInteger(bind)) {
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
const isOr = <T>(x: any): x is NestedCheckOr<T> =>
	typeof x === 'object' && 'or' in x;
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
	if (typeof check === 'string') {
		return stringCallback(check);
	}
	if (typeof check === 'boolean') {
		return check;
	}
	if (Array.isArray(check)) {
		let results: any[] = [];
		for (const subcheck of check) {
			const result = nestedCheck(subcheck, stringCallback);
			if (typeof result === 'boolean') {
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
	if (typeof check === 'object') {
		const checkTypes = Object.keys(check);
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
					if (typeof result === 'boolean') {
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

interface CollapsedFilter<T> extends Array<string | T | CollapsedFilter<T>> {
	0: string;
}

const collapsePermissionFilters = <T>(
	v: NestedCheck<{ filter: T }>,
): T | CollapsedFilter<T> => {
	if (Array.isArray(v)) {
		return collapsePermissionFilters({ or: v });
	}
	if (typeof v === 'object') {
		if ('filter' in v) {
			return v.filter;
		}
		if ('and' in v) {
			return ['and', ...v.and.map(collapsePermissionFilters)];
		}
		if ('or' in v) {
			return ['or', ...v.or.map(collapsePermissionFilters)];
		}
		throw new Error(
			'Permission filter objects must have `filter` or `and` or `or` keys',
		);
	}
	return v;
};

const namespaceRelationships = (
	relationships: Relationship,
	alias: string,
): void => {
	_.forEach(relationships, (relationship: Relationship, key) => {
		if (key === '$') {
			return;
		}

		let mapping = relationship.$;
		if (mapping != null && mapping.length === 2) {
			mapping = _.cloneDeep(mapping);
			// we do check the length above, but typescript thinks the second
			// element could be undefined
			mapping[1]![0] = `${mapping[1]![0]}$${alias}`;
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
	return nestedCheck(checkObject, (permissionCheck):
		| boolean
		| string
		| NestedCheckOr<string> => {
		const resourcePermission = permissionsLookup['resource.' + permissionCheck];
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
	});
};

const convertToLambda = (filter: AnyObject, identifier: string) => {
	// We need to inject all occurences of properties for the new lambda function
	// for example if there is an `or` operator, where different properties of
	// the target resource are used, we need to change all occurences of these.
	// We do this in a recursive way to also cover all nested cases like or [ and, and ]
	const replaceObject = (object: AnyObject) => {
		if (typeof object === 'string') {
			return;
		}
		if (Array.isArray(object)) {
			object.forEach((element) => {
				replaceObject(element);
			});
		}

		if (object.hasOwnProperty('name')) {
			object.property = { ...object };
			object.name = identifier;
			delete object.lambda;
		}
	};

	replaceObject(filter);
};

const rewriteSubPermissionBindings = (filter: AnyObject, counter: number) => {
	const rewrite = (object: AnyObject) => {
		if (object == null) {
			return;
		}

		if (typeof object.bind === 'number') {
			object.bind = counter + object.bind;
		}

		if (Array.isArray(object) || _.isObject(object)) {
			_.forEach(object, (v) => {
				rewrite(v);
			});
		}
	};

	rewrite(filter);
};

const buildODataPermission = (
	permissionsLookup: PermissionLookup,
	actionList: PermissionCheck,
	vocabulary: string,
	resourceName: string,
	odata: {
		tree: ODataParser.ODataQuery;
		binds: ODataParser.ODataBinds;
	},
) => {
	const conditionalPerms = $checkPermissions(
		permissionsLookup,
		actionList,
		vocabulary,
		resourceName,
	);
	if (conditionalPerms === false) {
		// We reuse a constant permission error here as it will be cached, and
		// using a single error instance can drastically reduce the memory used
		throw constrainedPermissionError;
	}
	if (conditionalPerms === true) {
		// If we have full access then no need to provide a constrained definition
		return false;
	}

	const permissionFilters = nestedCheck(conditionalPerms, (permissionCheck) => {
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

	return collapsedPermissionFilters;
};

const constrainedPermissionError = new PermissionError();
const generateConstrainedAbstractSql = (
	permissionsLookup: PermissionLookup,
	actionList: PermissionCheck,
	vocabulary: string,
	resourceName: string,
) => {
	const abstractSQLModel = sbvrUtils.getAbstractSqlModel({
		vocabulary,
	});
	const odata = memoizedParseOdata(`/${resourceName}`);

	const collapsedPermissionFilters = buildODataPermission(
		permissionsLookup,
		actionList,
		vocabulary,
		resourceName,
		odata,
	);

	_.set(odata, ['tree', 'options', '$filter'], collapsedPermissionFilters);

	const lambdaAlias = randomstring.generate(20);
	let inc = 0;

	// We need to trace the processed resources, to be able to break
	// permissions circles.
	const canAccessTrace: string[] = [resourceName];

	const canAccessFunction: ResourceFunction = function (property: AnyObject) {
		// remove method property so that we won't loop back here again at this point
		delete property.method;

		if (!this.defaultResource) {
			throw new Error(`No resource selected in AST.`);
		}

		const targetResource = this.NavigateResources(
			this.defaultResource,
			property.name,
		);

		const targetResourceName = sqlNameToODataName(targetResource.resource.name);

		if (canAccessTrace.includes(targetResourceName)) {
			// we don't want to allow permission loops for now, therefore we are
			// throwing the exception here. If we ever want to allow permission
			// loops return a false AST statement here (like true eq false), to
			// not recursivley follow query branches in a deep first search.
			throw new PermissionError(
				`Permissions for ${resourceName} form a circle by the following path: ${canAccessTrace.join(
					' -> ',
				)} -> ${targetResourceName}`,
			);
		}

		const parentOdata = memoizedParseOdata(`/${targetResourceName}`);

		const collapsedParentPermissionFilters = buildODataPermission(
			permissionsLookup,
			actionList,
			vocabulary,
			targetResourceName,
			parentOdata,
		);

		if (collapsedParentPermissionFilters === false) {
			// We reuse a constant permission error here as it will be cached, and
			// using a single error instance can drastically reduce the memory used
			throw constrainedPermissionError;
		}

		const lambdaId = `${lambdaAlias}+${inc}`;
		inc = inc + 1;
		rewriteSubPermissionBindings(
			collapsedParentPermissionFilters,
			this.bindVarsLength + this.extraBindVars.length,
		);
		convertToLambda(collapsedParentPermissionFilters, lambdaId);
		property.lambda = {
			method: 'any',
			identifier: lambdaId,
			expression: collapsedParentPermissionFilters,
		};

		this.extraBindVars.push(...parentOdata.binds);

		canAccessTrace.push(targetResourceName);
		try {
			return this.Property(property);
		} finally {
			canAccessTrace.pop();
		}
	};

	const odata2AbstractSQL = new OData2AbstractSQL(abstractSQLModel, {
		canAccess: canAccessFunction,
	});
	const { tree, extraBindVars } = odata2AbstractSQL.match(
		odata.tree,
		'GET',
		[],
		odata.binds.length,
	);

	odata.binds.push(...extraBindVars);
	const odataBinds = odata.binds;

	const abstractSqlQuery = [...tree];
	// Remove aliases from the top level select
	const selectIndex = abstractSqlQuery.findIndex((v) => v[0] === 'Select');
	const select = (abstractSqlQuery[selectIndex] = [
		...abstractSqlQuery[selectIndex],
	] as SelectNode);
	select[1] = select[1].map(
		(selectField): AbstractSqlType => {
			if (selectField[0] === 'Alias') {
				const maybeField = (selectField as AliasNode<any>)[1];
				const fieldType = maybeField[0];
				if (fieldType === 'ReferencedField' || fieldType === 'Field') {
					return maybeField;
				}
				return [
					'Alias',
					maybeField,
					odataNameToSqlName((selectField as AliasNode<any>)[2]),
				];
			}
			if (selectField.length === 2 && Array.isArray(selectField[0])) {
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
	let thrownErr: Error | undefined;
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

	Object.getOwnPropertyNames(obj).forEach((prop) => {
		// We skip the definition because we know it's a property we've defined that will throw an error in some cases
		if (
			prop !== 'definition' &&
			obj.hasOwnProperty(prop) &&
			obj[prop] !== null &&
			!['object', 'function'].includes(typeof obj[prop])
		) {
			deepFreezeExceptDefinition(obj);
		}
	});
};

const createBypassDefinition = (definition: Definition) =>
	_.cloneDeepWith(definition, (abstractSql) => {
		if (
			Array.isArray(abstractSql) &&
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

const rewriteRelationship = memoizeWeak(
	(
		value: Relationship,
		name: string,
		abstractSqlModel: AbstractSqlModel,
		permissionsLookup: PermissionLookup,
		vocabulary: string,
		odata2AbstractSQL: OData2AbstractSQL,
	) => {
		let escapedName = sqlNameToODataName(name);
		if (abstractSqlModel.tables[name]) {
			escapedName = sqlNameToODataName(abstractSqlModel.tables[name].name);
		}

		const rewrite = (object: Relationship | RelationshipMapping) => {
			if ('$' in object && Array.isArray(object.$)) {
				// object is in the form of
				// { "$": ["actor", ["actor", "id"]] } or { "$": ["device type"] }
				// we are only interested in the first case, since this is a relationship
				// to a different resource
				const mapping = object.$;
				if (
					mapping.length === 2 &&
					Array.isArray(mapping[1]) &&
					mapping[1].length === 2 &&
					typeof mapping[1][0] === 'string'
				) {
					// now have ensured that mapping looks like ["actor", ["actor", "id"]]
					// this relations ship means that:
					//   mapping[0] is the local field
					//   mapping[1] is the reference to the other resource, that joins this resource
					//   mapping[1][0] is the name of the other resource (actor in the example)
					//   mapping[1][1] is the name of the field on the other resource
					//
					// this therefore defines that the local field `actor` needs
					// to match the `id` of the `actor` resources for the join

					const possibleTargetResourceName = mapping[1][0];

					// Skip this if we already shortcut this connection
					if (possibleTargetResourceName.endsWith('$bypass')) {
						return;
					}

					const targetResourceEscaped = sqlNameToODataName(
						abstractSqlModel.tables[possibleTargetResourceName]?.name ??
							possibleTargetResourceName,
					);

					// This is either a translated or bypassed resource we don't
					// mess with these
					if (targetResourceEscaped.includes('$')) {
						return;
					}

					let foundCanAccessLink = false;

					try {
						const odata = memoizedParseOdata(`/${targetResourceEscaped}`);

						const collapsedPermissionFilters = buildODataPermission(
							permissionsLookup,
							methodPermissions.GET,
							vocabulary,
							targetResourceEscaped,
							odata,
						);

						_.set(
							odata,
							['tree', 'options', '$filter'],
							collapsedPermissionFilters,
						);

						const canAccessFunction: ResourceFunction = function (
							property: AnyObject,
						) {
							// remove method property so that we won't loop back here again at this point
							delete property.method;

							if (!this.defaultResource) {
								throw new Error(`No resource selected in AST.`);
							}

							const targetResourceAST = this.NavigateResources(
								this.defaultResource,
								property.name,
							);

							const targetResourceName = sqlNameToODataName(
								targetResourceAST.resource.name,
							);
							const currentResourceName = sqlNameToODataName(
								this.defaultResource.name,
							);

							if (
								currentResourceName === targetResourceEscaped &&
								targetResourceName === escapedName
							) {
								foundCanAccessLink = true;
							}
							// return a true expression to not select the relationship, which might be virtual
							// this should be a boolean expression, but needs to be a subquery in case it
							// is wrapped in an `or` or `and`
							return ['Equals', ['Boolean', true], ['Boolean', true]];
						};

						try {
							// We need execute the abstract SQL compiler to traverse
							// through the permissions for that resource, using a
							// special canAccess callback.
							odata2AbstractSQL.match(
								odata.tree,
								'GET',
								[],
								odata.binds.length,
								{
									canAccess: canAccessFunction,
								},
							);
						} catch (e) {
							throw new ODataParser.SyntaxError(e);
						}
						if (foundCanAccessLink) {
							// store the resource name as it was with a $bypass
							// suffix in this relationship, this means that the
							// query generator will use the plain resource instead
							// of the filtered resource.
							mapping[1][0] = `${possibleTargetResourceName}$bypass`;
						}
					} catch (e) {
						if (e === constrainedPermissionError) {
							// ignore
							return;
						}

						// TODO: We should investigate in detail why this error
						// occurse. It might be able to get rid of this.
						if (e instanceof ODataParser.SyntaxError) {
							// ignore
							return;
						}

						throw e;
					}
				}
			}

			if (Array.isArray(object) || _.isObject(object)) {
				_.forEach(object, (v) => {
					// we want to recurse into the relationship path, but
					// in case we hit a plain string, we don't need to bother
					// checking it. This can happen since plain terms also have
					// relationships to sbvr-types.
					if (typeof v !== 'string') {
						rewrite(v as Relationship | RelationshipMapping);
					}
				});
			}
		};

		rewrite(value);
	},
);

const rewriteRelationships = (
	abstractSqlModel: AbstractSqlModel,
	relationships: {
		[resourceName: string]: Relationship;
	},
	permissionsLookup: PermissionLookup,
	vocabulary: string,
) => {
	const originalAbstractSQLModel = sbvrUtils.getAbstractSqlModel({
		vocabulary,
	});

	const odata2AbstractSQL = memoizedGetOData2AbstractSQL(
		originalAbstractSQLModel,
	);

	const newRelationships = _.cloneDeep(relationships);
	_.forOwn(newRelationships, (value, name) =>
		rewriteRelationship(
			value,
			name,
			abstractSqlModel,
			permissionsLookup,
			vocabulary,
			odata2AbstractSQL,
		),
	);

	return newRelationships;
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

				_.forEach(constrainedAbstractSqlModel.tables, (table, resourceName) => {
					const bypassResourceName = `${resourceName}$bypass`;
					constrainedAbstractSqlModel.tables[bypassResourceName] = {
						...table,
					};
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

							const permissionsTable = (tables[permissionResourceName] = {
								...table,
							});
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

				// rewrite the relationships of the constraint model
				// we check if given the current permissions we can direct
				// expands and filters to unconstraint resources
				constrainedAbstractSqlModel.relationships = rewriteRelationships(
					constrainedAbstractSqlModel,
					constrainedAbstractSqlModel.relationships,
					permissionsLookup,
					vocabulary,
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

const getCheckPasswordQuery = _.once(() =>
	sbvrUtils.api.Auth.prepare<{ username: string }>({
		resource: 'user',
		passthrough: {
			req: rootRead,
		},
		id: {
			username: { '@': 'username' },
		},
		options: {
			$select: ['id', 'actor', 'password'],
		},
	}),
);
export const checkPassword = async (
	username: string,
	password: string,
): Promise<{
	id: number;
	actor: number;
	username: string;
	permissions: string[];
}> => {
	const user = await getCheckPasswordQuery()({
		username,
	});
	if (user == null) {
		throw new Error('User not found');
	}
	const hash = user.password;
	const userId = user.id;
	const actorId = user.actor;
	const res = await sbvrUtils.sbvrTypes.Hashed.compare(password, hash);
	if (!res) {
		throw new Error('Passwords do not match');
	}
	const permissions = await getUserPermissions(userId);
	return {
		id: userId,
		actor: actorId,
		username,
		permissions,
	};
};

const getUserPermissionsQuery = _.once(() =>
	sbvrUtils.api.Auth.prepare<{ userId: number }>({
		resource: 'permission',
		passthrough: {
			req: rootRead,
		},
		options: {
			$select: 'name',
			$filter: {
				$or: {
					is_of__user: {
						$any: {
							$alias: 'uhp',
							$expr: {
								uhp: { user: { '@': 'userId' } },
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
																uhr: { user: { '@': 'userId' } },
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
			},
			// We orderby to increase the hit rate for the `_checkPermissions` memoisation
			$orderby: {
				name: 'asc',
			},
		},
	}),
);
export const getUserPermissions = async (userId: number): Promise<string[]> => {
	if (typeof userId === 'string') {
		userId = parseInt(userId, 10);
	}
	if (!Number.isFinite(userId)) {
		throw new Error(`User ID has to be numeric, got: ${typeof userId}`);
	}
	try {
		const permissions = (await getUserPermissionsQuery()({
			userId,
		})) as Array<{ name: string }>;
		return permissions.map((permission) => permission.name);
	} catch (err) {
		sbvrUtils.api.Auth.logger.error('Error loading user permissions', err);
		throw err;
	}
};

const getApiKeyPermissionsQuery = _.once(() =>
	sbvrUtils.api.Auth.prepare<{ apiKey: string }>({
		resource: 'permission',
		passthrough: {
			req: rootRead,
		},
		options: {
			$select: 'name',
			$filter: {
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
												k: { key: { '@': 'apiKey' } },
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
																				k: { key: { '@': 'apiKey' } },
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
			},
			// We orderby to increase the hit rate for the `_checkPermissions` memoisation
			$orderby: {
				name: 'asc',
			},
		},
	}),
);
const $getApiKeyPermissions = memoize(
	async (apiKey: string) => {
		try {
			const permissions = (await getApiKeyPermissionsQuery()({
				apiKey,
			})) as Array<{ name: string }>;
			return permissions.map((permission) => permission.name);
		} catch (err) {
			sbvrUtils.api.Auth.logger.error('Error loading api key permissions', err);
			throw err;
		}
	},
	{
		primitive: true,
		promise: true,
		max: env.cache.apiKeys.max,
		maxAge: env.cache.apiKeys.maxAge,
	},
);

export const getApiKeyPermissions = async (
	apiKey: string,
): Promise<string[]> => {
	if (typeof apiKey !== 'string') {
		throw new Error('API key has to be a string, got: ' + typeof apiKey);
	}
	return $getApiKeyPermissions(apiKey);
};

const getApiKeyActorIdQuery = _.once(() =>
	sbvrUtils.api.Auth.prepare<{ apiKey: string }>({
		resource: 'api_key',
		passthrough: {
			req: rootRead,
		},
		id: {
			key: { '@': 'apiKey' },
		},
		options: {
			$select: 'is_of__actor',
		},
	}),
);
const apiActorPermissionError = new PermissionError();
const getApiKeyActorId = memoize(
	async (apiKey: string) => {
		const apiKeyResult = await getApiKeyActorIdQuery()({
			apiKey,
		});
		if (apiKeyResult == null) {
			// We reuse a constant permission error here as it will be cached, and
			// using a single error instance can drastically reduce the memory used
			throw apiActorPermissionError;
		}
		const apiKeyActorID = apiKeyResult.is_of__actor.__id;
		if (apiKeyActorID == null) {
			throw new Error('API key is not linked to a actor?!');
		}
		return apiKeyActorID as number;
	},
	{
		primitive: true,
		promise: true,
		maxAge: env.cache.apiKeys.maxAge,
	},
);

const checkApiKey = async (req: PermissionReq, apiKey: string) => {
	if (apiKey == null || req.apiKey != null) {
		return;
	}
	let permissions: string[];
	try {
		permissions = await getApiKeyPermissions(apiKey);
	} catch (err) {
		console.warn('Error with API key:', err);
		// Ignore errors getting the api key and just use an empty permissions object.
		permissions = [];
	}
	let actor;
	if (permissions.length > 0) {
		actor = await getApiKeyActorId(apiKey);
	}
	req.apiKey = {
		key: apiKey,
		permissions,
	};
	if (actor != null) {
		req.apiKey.actor = actor;
	}
};

export const customAuthorizationMiddleware = (expectedScheme = 'Bearer') => {
	expectedScheme = expectedScheme.toLowerCase();
	return async (
		req: Express.Request,
		_res?: Express.Response,
		next?: Express.NextFunction,
	): Promise<void> => {
		try {
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

			await checkApiKey(req, apiKey);
		} finally {
			next?.();
		}
	};
};

// A default bearer middleware for convenience
export const authorizationMiddleware = customAuthorizationMiddleware();

export const customApiKeyMiddleware = (paramName = 'apikey') => {
	if (paramName == null) {
		paramName = 'apikey';
	}
	return async (
		req: HookReq | Express.Request,
		_res?: Express.Response,
		next?: Express.NextFunction,
	): Promise<void> => {
		try {
			const apiKey =
				req.params[paramName] != null
					? req.params[paramName]
					: req.body[paramName] != null
					? req.body[paramName]
					: req.query[paramName];
			await checkApiKey(req, apiKey);
		} finally {
			next?.();
		}
	};
};

// A default api key middleware for convenience
export const apiKeyMiddleware = customApiKeyMiddleware();

export const checkPermissions = async (
	req: PermissionReq,
	actionList: PermissionCheck,
	resourceName?: string,
	vocabulary?: string,
) => {
	const permissionsLookup = await getReqPermissions(req);
	return $checkPermissions(
		permissionsLookup,
		actionList,
		vocabulary,
		resourceName,
	);
};

export const checkPermissionsMiddleware = (
	action: PermissionCheck,
): Express.RequestHandler => async (req, res, next) => {
	try {
		const allowed = await checkPermissions(req, action);
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
	} catch (err) {
		sbvrUtils.api.Auth.logger.error(
			'Error checking permissions',
			err,
			err.stack,
		);
		res.sendStatus(503);
	}
};

const getGuestPermissions = memoize(
	async () => {
		// Get guest user
		const result = (await sbvrUtils.api.Auth.get({
			resource: 'user',
			passthrough: {
				req: rootRead,
			},
			id: {
				username: 'guest',
			},
			options: {
				$select: 'id',
			},
		})) as { id: number } | undefined;
		if (result == null) {
			throw new Error('No guest user');
		}
		return _.uniq(await getUserPermissions(result.id));
	},
	{ promise: true },
);

const getReqPermissions = async (
	req: PermissionReq,
	odataBinds: ODataBinds = [],
) => {
	const [guestPermissions] = await Promise.all([
		getGuestPermissions(),
		(async () => {
			// TODO: Remove this extra actor ID lookup making actor non-optional and updating open-balena-api.
			if (
				req.apiKey != null &&
				req.apiKey.actor == null &&
				req.apiKey.permissions != null &&
				req.apiKey.permissions.length > 0
			) {
				const actorId = await getApiKeyActorId(req.apiKey.key);
				req.apiKey!.actor = actorId;
			}
		})(),
	]);

	if (guestPermissions.some((p) => DEFAULT_ACTOR_BIND_REGEX.test(p))) {
		throw new Error('Guest permissions cannot reference actors');
	}

	let permissions = guestPermissions;

	let actorIndex = 0;
	const addActorPermissions = (actorId: number, actorPermissions: string[]) => {
		let actorBind = DEFAULT_ACTOR_BIND;
		if (actorIndex > 0) {
			actorBind += actorIndex;
			actorPermissions = actorPermissions.map((actorPermission) =>
				actorPermission.replace(DEFAULT_ACTOR_BIND_REGEX, actorBind),
			);
		}
		odataBinds[actorBind] = ['Real', actorId];
		actorIndex++;
		permissions = permissions.concat(actorPermissions);
	};

	if (req.user != null && req.user.permissions != null) {
		addActorPermissions(req.user.actor, req.user.permissions);
	} else if (req.apiKey != null && req.apiKey.permissions != null) {
		addActorPermissions(req.apiKey.actor!, req.apiKey.permissions);
	}

	permissions = _.uniq(permissions);

	return getPermissionsLookup(permissions);
};

export const addPermissions = async (
	req: PermissionReq,
	request: ODataRequest & { permissionType?: PermissionCheck },
): Promise<void> => {
	const { vocabulary, resourceName, odataQuery, odataBinds } = request;
	let { method } = request;
	let abstractSqlModel = sbvrUtils.getAbstractSqlModel(request);
	method = method.toUpperCase() as SupportedMethod;
	const isMetadataEndpoint =
		metadataEndpoints.includes(resourceName) || method === 'OPTIONS';

	let permissionType: PermissionCheck;
	if (request.permissionType != null) {
		permissionType = request.permissionType;
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
		return;
	}
	const permissionsLookup = await getReqPermissions(req, odataBinds);
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
};

export const config = {
	models: [
		{
			apiRoot: 'Auth',
			modelText: userModel,
			customServerCode: exports,
			migrations: {
				'11.0.0-modified-at': `
					ALTER TABLE "actor"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

					ALTER TABLE "api key"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
					ALTER TABLE "api key-has-permission"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
					ALTER TABLE "api key-has-role"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

					ALTER TABLE "permission"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

					ALTER TABLE "role"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

					ALTER TABLE "user"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
					ALTER TABLE "user-has-role"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
					ALTER TABLE "user-has-permission"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				`,
				'11.0.1-modified-at': `
					ALTER TABLE "role-has-permission"
					ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
				`,
			},
		},
	] as sbvrUtils.ExecutableModel[],
};
export const setup = () => {
	sbvrUtils.addPureHook('all', 'all', 'all', {
		PREPARSE: ({ req }) => apiKeyMiddleware(req),
		POSTPARSE: async ({
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
			await addPermissions(req, request);
		},
		PRERESPOND: ({ request, data }) => {
			if (request.custom.isAction === 'canAccess' && _.isEmpty(data)) {
				// If the caller does not have any permissions to access the
				// resource pine will throw a PermissionError. To have the
				// same behavior for the case that the user has permissions
				// to access the resource, but not this instance we also
				// throw a PermissionError if the result is empty.
				throw new PermissionError();
			}
		},
	});

	sbvrUtils.addPureHook('POST', 'Auth', 'user', {
		POSTPARSE: async ({ request, api }) => {
			const result = (await api.post({
				resource: 'actor',
				options: { returnResource: false },
			})) as AnyObject;
			request.values.actor = result.id;
		},
	});

	sbvrUtils.addPureHook('DELETE', 'Auth', 'user', {
		POSTRUN: ({ request, api }) =>
			api.delete({
				resource: 'actor',
				id: request.values.actor,
			}),
	});
};

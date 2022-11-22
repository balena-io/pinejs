import type {
	AbstractSqlModel,
	AbstractSqlQuery,
	AbstractSqlType,
	AliasNode,
	Definition,
	FieldNode,
	ReferencedFieldNode,
	Relationship,
	RelationshipInternalNode,
	RelationshipLeafNode,
	RelationshipMapping,
	SelectNode,
	SelectQueryNode,
} from '@balena/abstract-sql-compiler';
import './express-extension';
import type * as Express from 'express';
import type {
	ODataBinds,
	ODataQuery,
	SupportedMethod,
} from '@balena/odata-parser';
import type { Tx } from '../database-layer/db';
import type { ApiKey, User } from '../sbvr-api/sbvr-utils';
import type { AnyObject, Dictionary } from './common-types';

import {
	isBindReference,
	type OData2AbstractSQL,
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
import { HookReq, addPureHook, addHook } from './hooks';
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
		permissions: ['resource.read'],
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
	O,
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
	GET: 'read',
	PUT: {
		and: ['create', 'update'],
	},
	POST: 'create',
	PATCH: 'update',
	MERGE: 'update',
	DELETE: 'delete',
};

const $parsePermissions = env.createCache(
	'parsePermissions',
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
	typeof x === 'object' && 'and' in x;
const isOr = <T>(x: any): x is NestedCheckOr<T> =>
	typeof x === 'object' && 'or' in x;
export function nestedCheck<I extends {}, O>(
	check: string,
	stringCallback: (s: string) => O,
): O;
export function nestedCheck<I extends {}, O>(
	check: boolean,
	stringCallback: (s: string) => O,
): boolean;
export function nestedCheck<I extends {}, O>(
	check: NestedCheck<I>,
	stringCallback: (s: string) => O,
): Exclude<I, string> | O | MappedNestedCheck<typeof check, I, O>;
export function nestedCheck<I extends {}, O>(
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

		let mapping = (relationship as RelationshipLeafNode).$;
		if (mapping != null && mapping.length === 2) {
			mapping = _.cloneDeep(mapping);
			// we do check the length above, but typescript thinks the second
			// element could be undefined
			mapping[1]![0] = `${mapping[1]![0]}$${alias}`;
			(relationships as RelationshipInternalNode)[`${key}$${alias}`] = {
				$: mapping,
			};
		}
		namespaceRelationships(relationship, alias);
	});
};

type PermissionLookup = Dictionary<true | string[]>;

const getPermissionsLookup = env.createCache(
	'permissionsLookup',
	(permissions: string[], guestPermissions?: string[]): PermissionLookup => {
		if (guestPermissions != null) {
			permissions = [...guestPermissions, ...permissions];
		}
		const permissionsLookup: PermissionLookup = {};
		for (const permission of permissions) {
			const [target, condition] = permission.split('?');
			if (condition == null) {
				// We have unconditional permission
				permissionsLookup[target] = true;
			} else if (permissionsLookup[target] !== true) {
				permissionsLookup[target] ??= [];
				(
					permissionsLookup[target] as Exclude<
						PermissionLookup[typeof target],
						true
					>
				).push(condition);
			}
		}
		// Ensure there are no duplicate conditions as applying both would be wasteful
		for (const target of Object.keys(permissionsLookup)) {
			const conditions = permissionsLookup[target];
			if (conditions !== true) {
				permissionsLookup[target] = _.uniq(conditions);
			}
		}
		return permissionsLookup;
	},
	{
		normalizer: ([permissions, guestPermissions]) =>
			// When guestPermissions is present it should always be the same, so we can key by presence not content
			`${permissions}${guestPermissions == null}`,
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
			for (const element of object) {
				replaceObject(element);
			}
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

		if (Array.isArray(object) || typeof object === 'object') {
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
		return;
	}

	const permissionFilters = nestedCheck(conditionalPerms, (permissionCheck) => {
		try {
			// We use an object with filter key to avoid collapsing our filters later.
			return {
				filter: parsePermissions(permissionCheck, odata.binds),
			};
		} catch (e: any) {
			console.warn(
				'Failed to parse conditional permissions: ',
				permissionCheck,
			);
			throw new PermissionParsingError(e);
		}
	});

	const collapsedPermissionFilters =
		collapsePermissionFilters(permissionFilters);

	return collapsedPermissionFilters;
};

const constrainedPermissionError = new PermissionError();
const generateConstrainedAbstractSql = (
	permissionsLookup: PermissionLookup,
	actionList: PermissionCheck,
	vocabulary: string,
	resourceName: string,
): Definition | undefined => {
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

	if (collapsePermissionFilters == null) {
		// If we have full access then there's no need to provide a constrained
		// definition, just use the table directly.
		return;
	}

	_.set(odata, ['tree', 'options', '$filter'], collapsedPermissionFilters);

	const lambdaAlias = randomstring.generate(20);
	let inc = 0;

	// We need to trace the processed resources, to be able to break
	// permissions circles.
	const canAccessTrace: string[] = [resourceName];

	const resolveBind = (maybeBind: any, extraBinds: ODataBinds) => {
		if (isBindReference(maybeBind)) {
			const { bind } = maybeBind;
			if (typeof bind === 'string' || bind < odata.binds.length) {
				return odata.binds[bind];
			}
			return extraBinds[bind - odata.binds.length];
		}
		return maybeBind;
	};
	const canAccessFunction: ResourceFunction = function (property) {
		// remove method property so that we won't loop back here again at this point
		const { method, ...resolvedProperty } = property;

		if (!this.defaultResource) {
			throw new Error(`No resource selected in AST.`);
		}

		const targetResource = this.NavigateResources(
			this.defaultResource,
			resolvedProperty.name,
		);

		const lambdaId = `${lambdaAlias}+${inc}`;
		inc = inc + 1;

		const targetResourceName = sqlNameToODataName(targetResource.resource.name);

		const traceIndex = canAccessTrace.findIndex(
			(rName) => rName === targetResourceName,
		);
		if (traceIndex !== -1) {
			if (canAccessTrace[canAccessTrace.length - 1] !== targetResourceName) {
				throw new Error(
					`Indirectly circular 'canAccess()' permissions are not supported, currently permissions for ${resourceName} form an indirect circle by the following path: ${canAccessTrace.join(
						' -> ',
					)} -> ${targetResourceName}`,
				);
			}

			const { args } = method[1];
			const depthArg = resolveBind(args[0], this.extraBindVars);
			if (depthArg == null) {
				// To enable directly circular dependencies a depth must be specified and it was not
				throw new Error(
					`You must specify a depth if you want to enable directly circular 'canAccess()' permissions, currently permissions for ${resourceName} form a direct circle by the following path: ${canAccessTrace.join(
						' -> ',
					)} -> ${targetResourceName}`,
				);
			}
			const [type, depth] = depthArg;
			if (type !== 'Real' || !Number.isInteger(depth) || depth < 1) {
				throw new Error('The depth for `canAccess` must be an integer >= 1');
			}
			if (
				// Make sure we have enough traces yet to have exceeded the depth before checking if they match
				canAccessTrace.length > depth &&
				// We know there cannot be any gaps due to the indirect circle check above so we only need to check
				// that the final depth entry is the target resource to know they all must be
				canAccessTrace[canAccessTrace.length - depth] === targetResourceName
			) {
				resolvedProperty.lambda = {
					method: 'any',
					identifier: lambdaId,
					expression: ['eq', true, false],
				};
				return this.Property(resolvedProperty);
			}
		}

		const parentOdata = memoizedParseOdata(`/${targetResourceName}`);

		const collapsedParentPermissionFilters = buildODataPermission(
			permissionsLookup,
			actionList,
			vocabulary,
			targetResourceName,
			parentOdata,
		);

		if (collapsedParentPermissionFilters == null) {
			// full access
			return ['Equals', ['Boolean', true], ['Boolean', true]];
		}

		rewriteSubPermissionBindings(
			collapsedParentPermissionFilters,
			this.bindVarsLength + this.extraBindVars.length,
		);
		convertToLambda(collapsedParentPermissionFilters, lambdaId);
		resolvedProperty.lambda = {
			method: 'any',
			identifier: lambdaId,
			expression: collapsedParentPermissionFilters,
		};

		this.extraBindVars.push(...parentOdata.binds);

		canAccessTrace.push(targetResourceName);
		try {
			return this.Property(resolvedProperty);
		} finally {
			canAccessTrace.pop();
		}
	};

	const { tree, extraBindVars } = memoizedGetOData2AbstractSQL(
		abstractSQLModel,
	).match(odata.tree, 'GET', [], odata.binds.length, {
		canAccess: canAccessFunction,
	});

	odata.binds.push(...extraBindVars);
	const odataBinds = odata.binds;

	const abstractSqlQuery = [...tree] as SelectQueryNode;
	// Remove aliases from the top level select
	const select = abstractSqlQuery.find(
		(v): v is SelectNode => v[0] === 'Select',
	)!;
	select[1] = select[1].map((selectField): AbstractSqlType => {
		if (selectField[0] === 'Alias') {
			const sqlName = odataNameToSqlName((selectField as AliasNode<any>)[2]);
			const maybeField = (
				selectField as AliasNode<
					ReferencedFieldNode | FieldNode | AbstractSqlQuery
				>
			)[1];
			if (
				(maybeField[0] === 'ReferencedField' && maybeField[2] === sqlName) ||
				(maybeField[0] === 'Field' && maybeField[1] === sqlName)
			) {
				// If the field name matches the sql name version of the alias then use it directly
				return maybeField;
			}
			// Otherwise update the alias to use the sql name
			return ['Alias', maybeField, sqlName];
		}
		return selectField;
	});

	return { binds: odataBinds, abstractSql: abstractSqlQuery };
};

// Call the function once and either return the same result or throw the same error on subsequent calls
const onceGetter = <T, U extends keyof T>(
	obj: T,
	propName: U,
	fn: () => T[U],
) => {
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
			} catch (e: any) {
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

	for (const prop of Object.getOwnPropertyNames(obj)) {
		// We skip the definition because we know it's a property we've defined that will throw an error in some cases
		if (
			prop !== 'definition' &&
			obj.hasOwnProperty(prop) &&
			obj[prop] !== null &&
			!['object', 'function'].includes(typeof obj[prop])
		) {
			deepFreezeExceptDefinition(obj);
		}
	}
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

						if (collapsedPermissionFilters == null) {
							// If we have full access already then there's no need to
							// check for/rewrite based on `canAccess`
							return;
						}

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
						} catch (e: any) {
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

			if (Array.isArray(object) || typeof object === 'object') {
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
		[resourceName: string]: RelationshipInternalNode;
	},
	permissionsLookup: PermissionLookup,
	vocabulary: string,
): typeof relationships => {
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

				const origSynonyms = Object.entries(
					constrainedAbstractSqlModel.synonyms,
				);
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
							for (const [synonym, canonicalForm] of origSynonyms) {
								synonyms[`${synonym}$${alias}`] = `${canonicalForm}$${alias}`;
							}
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
					constrainedAbstractSqlModel.tables[bypassResourceName].resourceName =
						bypassResourceName;
					if (table.definition) {
						// If the table is definition based then just make the bypass version match but pointing to the equivalent bypassed resources
						constrainedAbstractSqlModel.tables[bypassResourceName].definition =
							createBypassDefinition(table.definition);
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
							const [resourceName, permissionsJSON] =
								permissionResourceName.split('$permissions');
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

const $getUserPermissions = (() => {
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
	return env.createCache(
		'userPermissions',
		async (userId: number, tx?: Tx) => {
			const permissions = (await getUserPermissionsQuery()(
				{
					userId,
				},
				undefined,
				{ tx },
			)) as Array<{ name: string }>;
			return permissions.map((permission) => permission.name);
		},
		{
			primitive: true,
			promise: true,
			normalizer: ([userId]) => `${userId}`,
		},
	);
})();
export const getUserPermissions = async (
	userId: number,
	tx?: Tx,
): Promise<string[]> => {
	if (typeof userId === 'string') {
		userId = parseInt(userId, 10);
	}
	if (!Number.isFinite(userId)) {
		throw new Error(`User ID has to be numeric, got: ${typeof userId}`);
	}
	try {
		return await $getUserPermissions(userId, tx);
	} catch (err: any) {
		sbvrUtils.api.Auth.logger.error('Error loading user permissions', err);
		throw err;
	}
};

const $getApiKeyPermissions = (() => {
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
													$or: [
														{
															k: { expiry_date: null },
														},
														{
															k: {
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
																					$or: [
																						{
																							k: { expiry_date: null },
																						},
																						{
																							k: {
																								expiry_date: {
																									$gt: { $now: null },
																								},
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
	return env.createCache(
		'apiKeyPermissions',
		async (apiKey: string, tx?: Tx) => {
			const permissions = (await getApiKeyPermissionsQuery()(
				{
					apiKey,
				},
				undefined,
				{ tx },
			)) as Array<{ name: string }>;
			return permissions.map((permission) => permission.name);
		},
		{
			primitive: true,
			promise: true,
			normalizer: ([apiKey]) => apiKey,
		},
	);
})();
export const getApiKeyPermissions = async (
	apiKey: string,
	tx?: Tx,
): Promise<string[]> => {
	if (typeof apiKey !== 'string') {
		throw new Error('API key has to be a string, got: ' + typeof apiKey);
	}
	try {
		return await $getApiKeyPermissions(apiKey, tx);
	} catch (err: any) {
		sbvrUtils.api.Auth.logger.error('Error loading api key permissions', err);
		throw err;
	}
};

const getApiKeyActorId = (() => {
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
				$filter: {
					$or: [
						{ expiry_date: null },
						{ expiry_date: { $gt: { $now: null } } },
					],
				},
			},
		}),
	);
	const apiActorPermissionError = new PermissionError();
	return env.createCache(
		'apiKeyActorId',
		async (apiKey: string, tx?: Tx) => {
			const apiKeyResult = await getApiKeyActorIdQuery()(
				{
					apiKey,
				},
				undefined,
				{ tx },
			);
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
			promise: true,
			primitive: true,
			normalizer: ([apiKey]) => apiKey,
		},
	);
})();

const checkApiKey = async (
	req: PermissionReq,
	apiKey: string,
	tx?: Tx,
): Promise<PermissionReq['apiKey']> => {
	if (apiKey == null || req.apiKey != null) {
		return;
	}
	let permissions: string[];
	try {
		permissions = await getApiKeyPermissions(apiKey, tx);
	} catch (err: any) {
		console.warn('Error with API key:', err);
		// Ignore errors getting the api key and just use an empty permissions object.
		permissions = [];
	}
	let actor;
	if (permissions.length > 0) {
		actor = await getApiKeyActorId(apiKey, tx);
	}
	const resolvedApiKey: PermissionReq['apiKey'] = {
		key: apiKey,
		permissions,
	};
	if (actor != null) {
		resolvedApiKey.actor = actor;
	}
	return resolvedApiKey;
};

export const resolveAuthHeader = async (
	req: Express.Request,
	expectedScheme = 'Bearer',
	// TODO: Consider making tx the second argument in the next major
	tx?: Tx,
): Promise<PermissionReq['apiKey']> => {
	const auth = req.header('Authorization');
	if (!auth) {
		return;
	}

	const parts = auth.split(' ');
	if (parts.length !== 2) {
		return;
	}

	const [scheme, apiKey] = parts;
	if (scheme.toLowerCase() !== expectedScheme.toLowerCase()) {
		return;
	}

	return await checkApiKey(req, apiKey, tx);
};

export const customAuthorizationMiddleware = (expectedScheme = 'Bearer') => {
	expectedScheme = expectedScheme.toLowerCase();
	return async (
		req: Express.Request,
		_res?: Express.Response,
		next?: Express.NextFunction,
	): Promise<void> => {
		try {
			const apiKey = await resolveAuthHeader(req, expectedScheme);
			if (apiKey) {
				req.apiKey = apiKey;
			}
		} finally {
			next?.();
		}
	};
};

// A default bearer middleware for convenience
export const authorizationMiddleware = customAuthorizationMiddleware();

export const resolveApiKey = async (
	req: HookReq | Express.Request,
	paramName = 'apikey',
	// TODO: Consider making tx the second argument in the next major
	tx?: Tx,
): Promise<PermissionReq['apiKey']> => {
	const apiKey =
		req.params[paramName] ?? req.body[paramName] ?? req.query[paramName];
	return await checkApiKey(req, apiKey, tx);
};

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
			const apiKey = await resolveApiKey(req, paramName);
			if (apiKey) {
				req.apiKey = apiKey;
			}
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

export const checkPermissionsMiddleware =
	(action: PermissionCheck): Express.RequestHandler =>
	async (req, res, next) => {
		try {
			const allowed = await checkPermissions(req, action);
			switch (allowed) {
				case false:
					res.status(401).end();
					return;
				case true:
					next();
					return;
				default:
					throw new Error(
						'checkPermissionsMiddleware returned a conditional permission',
					);
			}
		} catch (err: any) {
			sbvrUtils.api.Auth.logger.error(
				'Error checking permissions',
				err,
				err.stack,
			);
			res.status(503).end();
		}
	};

let guestPermissionsInitialized = false;
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
		const guestPermissions = _.uniq(await getUserPermissions(result.id));

		if (guestPermissions.some((p) => DEFAULT_ACTOR_BIND_REGEX.test(p))) {
			throw new Error('Guest permissions cannot reference actors');
		}
		guestPermissionsInitialized = true;
		return guestPermissions;
	},
	{ promise: true },
);

const getReqPermissions = async (
	req: PermissionReq,
	odataBinds: ODataBinds = [],
) => {
	const [guestPermissions] = await Promise.all([
		(async () => {
			if (
				guestPermissionsInitialized === false &&
				(req.user === root.user || req.user === rootRead.user)
			) {
				// In the case that guest permissions are not initialized yet and the query is being made with root permissions
				// then we need to bypass `getGuestPermissions` as it will cause an infinite loop back to here.
				// Therefore to break that loop we just ignore guest permissions.
				return [];
			}
			return await getGuestPermissions();
		})(),
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

	let actorPermissions: string[] = [];
	const addActorPermissions = (actorId: number, perms: string[]) => {
		odataBinds[DEFAULT_ACTOR_BIND] = ['Real', actorId];
		actorPermissions = perms;
	};

	if (req.user?.permissions != null) {
		addActorPermissions(req.user.actor, req.user.permissions);
	} else if (req.apiKey?.permissions != null) {
		addActorPermissions(req.apiKey.actor!, req.apiKey.permissions);
	}

	return getPermissionsLookup(actorPermissions, guestPermissions);
};

export const addPermissions = async (
	req: PermissionReq,
	request: ODataRequest & { permissionType?: PermissionCheck },
): Promise<void> => {
	const { vocabulary, resourceName, odataQuery, odataBinds } = request;
	let abstractSqlModel = sbvrUtils.getAbstractSqlModel(request);

	let { permissionType } = request;
	if (permissionType == null) {
		const method = request.method.toUpperCase() as SupportedMethod;
		const isMetadataEndpoint =
			method === 'OPTIONS' || metadataEndpoints.includes(resourceName);
		if (isMetadataEndpoint) {
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
				'14.42.0-api-key-expiry-date': `
					ALTER TABLE "api key"
					ADD COLUMN IF NOT EXISTS "expiry date" TIMESTAMP NULL;
				`,
			},
		},
	] as sbvrUtils.ExecutableModel[],
};
export const setup = () => {
	addHook('all', 'all', 'all', {
		sideEffects: false,
		readOnlyTx: true,
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
				request.odataQuery.property?.resource === 'canAccess'
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
		PRERESPOND: ({ request, response }) => {
			if (
				request.custom.isAction === 'canAccess' &&
				(response.body == null ||
					typeof response.body === 'string' ||
					_.isEmpty(response.body?.d))
			) {
				// If the caller does not have any permissions to access the
				// resource pine will throw a PermissionError. To have the
				// same behavior for the case that the user has permissions
				// to access the resource, but not this instance we also
				// throw a PermissionError if the result is empty.
				throw new PermissionError();
			}
		},
	});

	addPureHook('POST', 'Auth', 'user', {
		POSTPARSE: async ({ request, api }) => {
			const result = await api.post({
				resource: 'actor',
				options: { returnResource: false },
			});
			request.values.actor = result.id;
		},
	});

	addPureHook('DELETE', 'Auth', 'user', {
		POSTRUN: ({ request, api }) =>
			api.delete({
				resource: 'actor',
				id: request.values.actor,
			}),
	});
};

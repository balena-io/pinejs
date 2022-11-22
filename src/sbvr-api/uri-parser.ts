import type * as AbstractSQLCompiler from '@balena/abstract-sql-compiler';
import type {
	ODataBinds,
	ODataOptions,
	ODataQuery,
	SupportedMethod,
} from '@balena/odata-parser';
import type { Tx } from '../database-layer/db';
import type { InstantiatedHooks } from './hooks';
import type { AnyObject } from './common-types';

import * as ODataParser from '@balena/odata-parser';
export const SyntaxError = ODataParser.SyntaxError;
import { OData2AbstractSQL } from '@balena/odata-to-abstract-sql';
import * as _ from 'lodash';
import memoizeWeak = require('memoizee/weak');

export { BadRequestError, ParsingError, TranslationError } from './errors';
import * as deepFreeze from 'deep-freeze';
import * as env from '../config-loader/env';
import {
	BadRequestError,
	ParsingError,
	PermissionError,
	TranslationError,
} from './errors';
import * as sbvrUtils from './sbvr-utils';

export type OdataBinds = ODataBinds;

export interface UnparsedRequest {
	method: string;
	url: string;
	data?: any;
	headers?: { [header: string]: string };
	changeSet?: UnparsedRequest[];
	_isChangeSet?: boolean;
}

export interface ParsedODataRequest {
	method: SupportedMethod;
	url: string;
	vocabulary: string;
	resourceName: string;
	values: AnyObject;
	odataQuery: ODataQuery;
	odataBinds: OdataBinds;
	custom: AnyObject;
	id?: number | undefined;
	_defer?: boolean;
}
export interface ODataRequest extends ParsedODataRequest {
	abstractSqlModel?: AbstractSQLCompiler.AbstractSqlModel;
	abstractSqlQuery?: AbstractSQLCompiler.AbstractSqlQuery;
	sqlQuery?: AbstractSQLCompiler.SqlResult | AbstractSQLCompiler.SqlResult[];
	tx?: Tx;
	modifiedFields?: ReturnType<
		AbstractSQLCompiler.EngineInstance['getModifiedFields']
	>;
	affectedIds?: number[];
	pendingAffectedIds?: Promise<number[]>;
	hooks?: InstantiatedHooks;
	engine: AbstractSQLCompiler.Engines;
}

// Converts a value to its string representation and tries to parse is as an
// OData bind
export const parseId = (b: any) => {
	const { tree, binds } = ODataParser.parse(String(b), {
		startRule: 'ProcessRule',
		rule: 'KeyBind',
	});
	return binds[tree.bind];
};

export const memoizedParseOdata = (() => {
	const parseOdata = (url: string) => {
		const odata = ODataParser.parse(url);
		// if we parse a canAccess action rewrite the resource to ensure we
		// do not run the resource hooks
		if (
			odata.tree.property != null &&
			odata.tree.property.resource === 'canAccess'
		) {
			odata.tree.resource =
				odata.tree.resource + '#' + odata.tree.property.resource;
		}
		return odata;
	};

	const _memoizedParseOdata = env.createCache('parseOData', parseOdata, {
		primitive: true,
	});
	return (url: string) => {
		const queryParamsIndex = url.indexOf('?');
		if (queryParamsIndex !== -1) {
			if (/[?&(]@/.test(url)) {
				// Try to cache based on parameter aliases if there might be some
				const parameterAliases = new URLSearchParams();
				const queryParams = new URLSearchParams(url.slice(queryParamsIndex));
				for (const [key, value] of Array.from(queryParams.entries())) {
					if (key.startsWith('@')) {
						parameterAliases.append(key, value);
						queryParams.delete(key);
					}
				}
				const parameterAliasesString = parameterAliases.toString();
				if (parameterAliasesString !== '') {
					const parsed = _.cloneDeep(
						_memoizedParseOdata(
							url.slice(0, queryParamsIndex) +
								'?' +
								decodeURIComponent(queryParams.toString()),
						),
					);
					const parsedParams = ODataParser.parse(
						decodeURIComponent(parameterAliasesString),
						{
							startRule: 'ProcessRule',
							rule: 'QueryOptions',
						},
					);
					parsed.tree.options ??= {};
					for (const key of Object.keys(parsedParams.tree)) {
						parsed.tree.options[key] = parsedParams.tree[key];
						parsed.binds[key] = parsedParams.binds[key];
					}
					return parsed;
				}
			}
			// If we're doing a complex url then skip caching due to # of permutations
			return parseOdata(url);
		} else if (url.includes('(')) {
			// We're parsing a url like `/pilot(1)` so whilst there are no query options
			// there are still enough permutations to ruin the hit %
			return parseOdata(url);
		} else {
			// Else if it's simple we can easily skip the parsing as we know we'll get a high % hit rate
			// We deep clone to avoid mutations polluting the cache
			return _.cloneDeep(_memoizedParseOdata(url));
		}
	};
})();

export const memoizedGetOData2AbstractSQL = memoizeWeak(
	(abstractSqlModel: AbstractSQLCompiler.AbstractSqlModel) => {
		return new OData2AbstractSQL(abstractSqlModel, undefined, {
			// Use minimized aliases when not in debug mode for smaller queries
			minimizeAliases: !env.DEBUG,
		});
	},
);

const memoizedOdata2AbstractSQL = (() => {
	const $memoizedOdata2AbstractSQL = env.createCache(
		'odataToAbstractSql',
		(
			abstractSqlModel: AbstractSQLCompiler.AbstractSqlModel,
			odataQuery: ODataQuery,
			method: SupportedMethod,
			bodyKeys: string[],
			existingBindVarsLength: number,
		) => {
			try {
				const odata2AbstractSQL =
					memoizedGetOData2AbstractSQL(abstractSqlModel);
				const abstractSql = odata2AbstractSQL.match(
					odataQuery,
					method,
					bodyKeys,
					existingBindVarsLength,
				);
				// We deep freeze to prevent mutations, which would pollute the cache
				deepFreeze(abstractSql);
				return abstractSql;
			} catch (e) {
				if (e instanceof PermissionError) {
					throw e;
				}
				console.error(
					'Failed to translate url: ',
					JSON.stringify(odataQuery, null, '\t'),
					method,
					e,
				);
				throw new TranslationError('Failed to translate url');
			}
		},
		{
			normalizer: (
				_abstractSqlModel: AbstractSQLCompiler.AbstractSqlModel,
				[odataQuery, method, bodyKeys, existingBindVarsLength]: [
					ODataQuery,
					SupportedMethod,
					string[],
					number,
				],
			) => {
				return (
					JSON.stringify(odataQuery) +
					method +
					bodyKeys +
					existingBindVarsLength
				);
			},
			weak: true,
		},
	);
	const cachedProps = [
		'$select',
		'$filter',
		'$expand',
		'$orderby',
		'$top',
		'$skip',
		'$count',
		'$inlinecount',
		'$format',
	].map(_.toPath);

	return (
		request: Pick<
			ODataRequest,
			| 'method'
			| 'odataQuery'
			| 'odataBinds'
			| 'values'
			| 'vocabulary'
			| 'abstractSqlModel'
		>,
	) => {
		const { method, odataBinds, values } = request;
		let { odataQuery } = request;
		const abstractSqlModel = sbvrUtils.getAbstractSqlModel(request);
		// Sort the body keys to improve cache hits
		const sortedBody = Object.keys(values).sort();
		// Remove unused options for odata-to-abstract-sql to improve cache hits
		if (odataQuery.options) {
			odataQuery = {
				...odataQuery,
				options: _.pick(odataQuery.options, cachedProps) as ODataOptions,
			};
		}
		const { tree, extraBodyVars, extraBindVars } = $memoizedOdata2AbstractSQL(
			abstractSqlModel,
			odataQuery,
			method,
			sortedBody,
			odataBinds.length,
		);
		Object.assign(values, extraBodyVars);
		odataBinds.push(...extraBindVars);
		return tree;
	};
})();

export const metadataEndpoints = ['$metadata', '$serviceroot'];

export async function parseOData(
	b: UnparsedRequest & { _isChangeSet?: false },
): Promise<ParsedODataRequest>;
export async function parseOData(
	b: UnparsedRequest & { _isChangeSet: true },
): Promise<ParsedODataRequest[]>;
export async function parseOData(
	b: UnparsedRequest,
): Promise<ParsedODataRequest | ParsedODataRequest[]>;
export async function parseOData(
	b: UnparsedRequest,
): Promise<ParsedODataRequest | ParsedODataRequest[]> {
	try {
		if (b._isChangeSet && b.changeSet != null) {
			// We sort the CS set once, we must assure that requests which reference
			// other requests in the changeset are placed last. Once they are sorted
			// Map will guarantee retrival of results in insertion order
			const sortedCS = _.sortBy(b.changeSet, (el) => el.url[0] !== '/');
			const csReferences = new Map<
				ParsedODataRequest['id'],
				ParsedODataRequest
			>();
			for (const cs of sortedCS) {
				parseODataChangeset(csReferences, cs);
			}
			return Array.from(csReferences.values());
		} else {
			const { url, apiRoot } = splitApiRoot(b.url);
			const odata = memoizedParseOdata(url);

			return {
				method: b.method as SupportedMethod,
				url,
				vocabulary: apiRoot,
				resourceName: odata.tree.resource,
				values: b.data ?? {},
				odataQuery: odata.tree,
				odataBinds: odata.binds,
				custom: {},
				_defer: false,
			};
		}
	} catch (err: any) {
		if (err instanceof ODataParser.SyntaxError) {
			throw new BadRequestError(`Malformed url: '${b.url}'`);
		}
		if (!(err instanceof BadRequestError || err instanceof ParsingError)) {
			console.error('Failed to parse url: ', b.method, b.url, err);
			throw new ParsingError(`Failed to parse url: '${b.url}'`);
		}
		throw err;
	}
}

const parseODataChangeset = (
	csReferences: Map<ParsedODataRequest['id'], ParsedODataRequest>,
	b: UnparsedRequest,
): void => {
	const contentId: ParsedODataRequest['id'] = mustExtractHeader(
		b,
		'content-id',
	);

	if (csReferences.has(contentId)) {
		throw new BadRequestError('Content-Id must be unique inside a changeset');
	}

	let defer: boolean;
	let odata;
	let apiRoot: string;
	let url;

	if (b.url[0] === '/') {
		({ url, apiRoot } = splitApiRoot(b.url));
		odata = memoizedParseOdata(url);
		defer = false;
	} else {
		url = b.url;
		odata = memoizedParseOdata(url);
		const { bind } = odata.tree.resource;
		const [, id] = odata.binds[bind];
		// Use reference to collect information
		const ref = csReferences.get(id);
		if (ref === undefined) {
			throw new BadRequestError('Content-Id refers to a non existent resource');
		}
		apiRoot = ref.vocabulary;
		// Update resource with actual resourceName
		odata.tree.resource = ref.resourceName;
		defer = true;
	}

	const parseResult: ParsedODataRequest = {
		method: b.method as SupportedMethod,
		url,
		vocabulary: apiRoot,
		resourceName: odata.tree.resource,
		odataBinds: odata.binds,
		odataQuery: odata.tree,
		values: b.data ?? {},
		custom: {},
		id: contentId,
		_defer: defer,
	};
	csReferences.set(contentId, parseResult);
};

const splitApiRoot = (url: string) => {
	const [, apiRoot, ...urlParts] = url.split('/');
	if (apiRoot == null) {
		throw new ParsingError(`No such api root: ${apiRoot}`);
	}
	return { url: '/' + urlParts.join('/'), apiRoot };
};

const mustExtractHeader = (
	body: { headers?: { [header: string]: string } },
	header: string,
) => {
	const h: any = body.headers?.[header]?.[0];
	if (_.isEmpty(h)) {
		throw new BadRequestError(`${header} must be specified`);
	}
	return h;
};

export const translateUri = <
	T extends Pick<
		ODataRequest,
		| 'method'
		| 'odataQuery'
		| 'odataBinds'
		| 'values'
		| 'vocabulary'
		| 'resourceName'
		| 'abstractSqlModel'
	>,
>(
	request: T & {
		abstractSqlQuery?: ODataRequest['abstractSqlQuery'];
	},
): typeof request => {
	if (request.abstractSqlQuery != null) {
		return request;
	}
	const isMetadataEndpoint =
		metadataEndpoints.includes(request.resourceName) ||
		request.method === 'OPTIONS';
	if (!isMetadataEndpoint) {
		const abstractSqlQuery = memoizedOdata2AbstractSQL(request);
		request = { ...request };
		request.values = new Proxy(request.values, {
			set: (obj: ODataRequest['values'], prop: string, value) => {
				if (!obj.hasOwnProperty(prop)) {
					sbvrUtils.api[request.vocabulary].logger.warn(
						`Assigning a new request.values property '${prop}' however it will be ignored`,
					);
				}
				obj[prop] = value;
				return true;
			},
		});
		request.abstractSqlQuery = abstractSqlQuery;
		return request;
	}
	return request;
};

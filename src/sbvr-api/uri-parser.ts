import * as _AbstractSQLCompiler from '@resin/abstract-sql-compiler';

import * as ODataParser from '@resin/odata-parser';
import {
	ODataBinds,
	ODataOptions,
	ODataQuery,
	SupportedMethod,
} from '@resin/odata-parser';
import * as Bluebird from 'bluebird';
export const SyntaxError = ODataParser.SyntaxError;
import { OData2AbstractSQL } from '@resin/odata-to-abstract-sql';
import * as _ from 'lodash';
import * as memoize from 'memoizee';
import memoizeWeak = require('memoizee/weak');

export { BadRequestError, ParsingError, TranslationError } from './errors';
import * as deepFreeze from 'deep-freeze';
import * as env from '../config-loader/env';
import { Tx } from '../database-layer/db';
import {
	BadRequestError,
	ParsingError,
	PermissionError,
	TranslationError,
} from './errors';
import { InstantiatedHooks } from './hooks';
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

export interface ODataRequest {
	method: SupportedMethod;
	url: string;
	odataQuery: ODataQuery;
	odataBinds: OdataBinds;
	values: sbvrUtils.AnyObject;
	abstractSqlModel?: _AbstractSQLCompiler.AbstractSqlModel;
	abstractSqlQuery?: _AbstractSQLCompiler.AbstractSqlQuery;
	sqlQuery?: _AbstractSQLCompiler.SqlResult | _AbstractSQLCompiler.SqlResult[];
	resourceName: string;
	vocabulary: string;
	_defer?: boolean;
	id?: number;
	custom: sbvrUtils.AnyObject;
	tx?: Tx;
	modifiedFields?: ReturnType<
		_AbstractSQLCompiler.EngineInstance['getModifiedFields']
	>;
	hooks?: InstantiatedHooks<sbvrUtils.Hooks>;
	engine?: _AbstractSQLCompiler.Engines;
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

	const _memoizedParseOdata = memoize(parseOdata, {
		primitive: true,
		max: env.cache.parseOData.max,
	});
	return (url: string) => {
		const queryParamsIndex = url.indexOf('?');
		if (queryParamsIndex !== -1) {
			if (/[?&(]@/.test(url)) {
				// Try to cache based on parameter aliases if there might be some
				const parameterAliases = new URLSearchParams();
				const queryParams = new URLSearchParams(url.slice(queryParamsIndex));
				Array.from(queryParams.entries()).forEach(([key, value]) => {
					if (key.startsWith('@')) {
						parameterAliases.append(key, value);
						queryParams.delete(key);
					}
				});
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
					if (parsed.tree.options == null) {
						parsed.tree.options = {};
					}
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

const memoizedGetOData2AbstractSQL = memoizeWeak(
	(abstractSqlModel: _AbstractSQLCompiler.AbstractSqlModel) => {
		return new OData2AbstractSQL(abstractSqlModel);
	},
);

const memoizedOdata2AbstractSQL = (() => {
	const $memoizedOdata2AbstractSQL = memoizeWeak(
		(
			abstractSqlModel: _AbstractSQLCompiler.AbstractSqlModel,
			odataQuery: ODataQuery,
			method: SupportedMethod,
			bodyKeys: string[],
			existingBindVarsLength: number,
		) => {
			try {
				const odata2AbstractSQL = memoizedGetOData2AbstractSQL(
					abstractSqlModel,
				);
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
				_abstractSqlModel: _AbstractSQLCompiler.AbstractSqlModel,
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
			max: env.cache.odataToAbstractSql.max,
		},
	);

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
				options: _.pick(
					odataQuery.options,
					'$select',
					'$filter',
					'$expand',
					'$orderby',
					'$top',
					'$skip',
					'$count',
					'$inlinecount',
					'$format',
				) as ODataOptions,
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

export function parseOData(
	b: UnparsedRequest & { _isChangeSet?: false },
): Bluebird<ODataRequest>;
export function parseOData(
	b: UnparsedRequest & { _isChangeSet: true },
): Bluebird<ODataRequest[]>;
export function parseOData(
	b: UnparsedRequest,
): Bluebird<ODataRequest | ODataRequest[]>;
export function parseOData(
	b: UnparsedRequest,
): Bluebird<ODataRequest | ODataRequest[]> {
	return Bluebird.try<ODataRequest | ODataRequest[]>(() => {
		if (b._isChangeSet && b.changeSet != null) {
			// We sort the CS set once, we must assure that requests which reference
			// other requests in the changeset are placed last. Once they are sorted
			// Map will guarantee retrival of results in insertion order
			const sortedCS = _.sortBy(b.changeSet, (el) => el.url[0] !== '/');
			return Bluebird.reduce(
				sortedCS,
				parseODataChangeset,
				new Map<ODataRequest['id'], ODataRequest>(),
			).then(
				(csReferences) => Array.from(csReferences.values()) as ODataRequest[],
			);
		} else {
			const { url, apiRoot } = splitApiRoot(b.url);
			const odata = memoizedParseOdata(url);

			return {
				method: b.method as SupportedMethod,
				url,
				vocabulary: apiRoot,
				resourceName: odata.tree.resource,
				odataBinds: odata.binds,
				odataQuery: odata.tree,
				values: b.data ?? {},
				custom: {},
				_defer: false,
			};
		}
	}).catch((err) => {
		if (err instanceof ODataParser.SyntaxError) {
			throw new BadRequestError(`Malformed url: '${b.url}'`);
		}
		if (!(err instanceof BadRequestError || err instanceof ParsingError)) {
			console.error('Failed to parse url: ', b.method, b.url, err);
			throw new ParsingError(`Failed to parse url: '${b.url}'`);
		}
		throw err;
	});
}

const parseODataChangeset = (
	csReferences: Map<ODataRequest['id'], ODataRequest>,
	b: UnparsedRequest,
) => {
	const contentId: ODataRequest['id'] = mustExtractHeader(b, 'content-id');

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

	const parseResult: ODataRequest = {
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
	return csReferences;
};

const splitApiRoot = (url: string) => {
	const urlParts = url.split('/');
	const apiRoot = urlParts[1];
	if (apiRoot == null) {
		throw new ParsingError(`No such api root: ${apiRoot}`);
	}
	url = '/' + urlParts.slice(2).join('/');
	return { url, apiRoot };
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
	>
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
		request.abstractSqlQuery = abstractSqlQuery;
		return request;
	}
	return request;
};

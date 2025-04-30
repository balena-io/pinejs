import type { ODataQuery } from '@balena/odata-parser';
import {
	BadRequestError,
	type ParsedODataRequest,
} from '../sbvr-api/uri-parser.js';
import { api, type Response } from '../sbvr-api/sbvr-utils.js';
import type { Tx } from '../database-layer/db.js';
import { sbvrUtils } from '../server-glue/module.js';
import type { AnyObject } from 'pinejs-client-core';
import { UnauthorizedError } from '../sbvr-api/errors.js';

export type ODataActionRequest = Omit<ParsedODataRequest, 'odataQuery'> & {
	odataQuery: Omit<ODataQuery, 'property'> & {
		property: {
			resource: string;
		};
	};
};

type ActionReq = Express.Request;

export type ODataActionArgs<Vocab extends string = string> = {
	request: ODataActionRequest;
	tx: Tx;
	api: (typeof api)[Vocab];
	id: unknown;
	req: ActionReq;
};
export type ODataAction<Vocab extends string = string> = (
	args: ODataActionArgs<Vocab>,
) => Promise<Response>;

const actions: {
	[vocab: string]: {
		[resourceName: string]: {
			[actionName: string]: ODataAction;
		};
	};
} = {};

export const isActionRequest = (
	request: ParsedODataRequest,
): request is ODataActionRequest => {
	// OData actions must always be POST
	// See: https://www.odata.org/blog/actions-in-odata/
	return (
		request.method === 'POST' &&
		request.odataQuery.property?.resource != null &&
		actions[request.vocabulary]?.[request.resourceName]?.[
			request.odataQuery.property.resource
		] != null
	);
};

const runActionInTrasaction = async (
	request: ODataActionRequest,
	req: ActionReq,
	tx: Tx,
): Promise<Response> => {
	const actionName = request.odataQuery.property.resource;
	const action =
		actions[request.vocabulary]?.[request.resourceName]?.[actionName];
	if (action == null) {
		throw new BadRequestError();
	}

	// in practice, the parser does not currently allow actions without a key
	// so we keep it strict throwing in case this expectation is broken
	if (request.odataQuery.key == null) {
		throw new BadRequestError('Unbound OData actions are not supported');
	}
	const id = await canRunAction(request, req, actionName, tx);
	const applicationApi = api[request.vocabulary].clone({
		passthrough: { tx, req },
	});

	return await action({
		request,
		tx,
		api: applicationApi,
		req,
		id,
	});
};

export const runAction = async (
	request: ODataActionRequest,
	req: ActionReq,
) => {
	if (api[request.vocabulary] == null) {
		throw new BadRequestError();
	}

	return await (req.tx
		? runActionInTrasaction(request, req, req.tx)
		: sbvrUtils.db.transaction(async (tx) => {
				req.tx = tx;
				return await runActionInTrasaction(request, req, tx);
			}));
};

export const addAction = <Vocab extends string>(
	vocabulary: Vocab,
	resourceName: string,
	actionName: string,
	action: ODataAction<Vocab>,
) => {
	actions[vocabulary] ??= {};
	actions[vocabulary][resourceName] ??= {};
	actions[vocabulary][resourceName][actionName] = action;
};

export const canRunAction = async (
	request: ParsedODataRequest,
	req: ActionReq,
	actionName: string,
	tx: Tx,
) => {
	const canAccessUrl = request.url
		.slice(1)
		.split('?', 1)[0]
		.replace(new RegExp(`(${actionName})$`), 'canAccess');

	if (!canAccessUrl.endsWith('/canAccess')) {
		throw new UnauthorizedError();
	}

	const applicationApi = api[request.vocabulary];
	if (applicationApi == null) {
		throw new BadRequestError(`Could not find model ${request.vocabulary}`);
	}

	const res = await applicationApi.request({
		method: 'POST',
		url: canAccessUrl,
		body: { action: actionName },
		passthrough: { tx, req },
	});

	return canAccessResourceId(res);
};

const canAccessResourceId = (canAccessResponse: AnyObject): unknown => {
	const item = canAccessResponse?.d?.[0];
	if (item == null || typeof item !== 'object') {
		throw new UnauthorizedError();
	}
	const keys = Object.keys(item);
	if (keys.length !== 1 || item[keys[0]] == null) {
		throw new UnauthorizedError();
	}

	return item[keys[0]];
};

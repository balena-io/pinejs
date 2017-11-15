import * as express from 'express'
import * as _ from 'lodash'
import * as Promise from 'bluebird'
import TypedError = require('typed-error')
import { AnyObject } from 'pinejs-client/core';
import PinejsClient = require('pinejs-client');

class BadInputError extends TypedError {}
class UnauthorizedError extends TypedError {}

const sbvrUtils = require('./sbvr-utils');

const getAPIClient: GetAPIClient = sbvrUtils.getAPIClient as GetAPIClient

interface GetAPIClient {
	(vocab: string): PinejsClient
}

interface Authenticator {
	apiKey?: PermissionHolder
	user?: PermissionHolder
}

interface PermissionHolder {
	actor?: number
	key?: string
	permissions: string[]
}

function manipulatePermissions(originalPermissions: string[], resource: string, action: string): string[] {
	const targetActionPermissions = `resin.${resource}.${action}`;
	let permissionsInQuestion: string[] = [];
	originalPermissions.forEach((permission: string) => {
		if(_.startsWith(permission, targetActionPermissions)) {
			const rewrittenPermission = `resin.${resource}.read` + permission.slice(targetActionPermissions.length);
			permissionsInQuestion.push(rewrittenPermission);
		}
	});
	return permissionsInQuestion;
}

function validateParameters(resource: string, action: string, id: number): void {
	const RESOURCE_VALIDATOR = /^[a-z][a-z_]+[a-z]$/g
	const ACTION_VALIDATOR = /^[a-z]+$/g

	if (!RESOURCE_VALIDATOR.test(resource)) {
		throw new BadInputError('Invalid resource parameter');
	}

	if (!ACTION_VALIDATOR.test(action)) {
		throw new BadInputError('Invalid resource parameter');
	}

	if (_.isNaN(id) || id < 1) {
		throw new BadInputError('Invalid id value');
	}
}

export function checkAccessForResourceWithRequest(req: express.Request, api: PinejsClient, resource: string, action: string, id: number): Promise<void> {
	if (req.user != null) {
		return checkAccessForResource(req.user as PermissionHolder, api, resource, action, id);
	} else if (req.apiKey != null) {
		return checkAccessForResource(req.apiKey, api, resource, action, id);
	}
	return Promise.reject(new UnauthorizedError());
}

export function checkAccessForResource(user: PermissionHolder, api: PinejsClient, resource: string, action: string, id: number): Promise<void> {

	// validate parameters
	validateParameters(resource, action, id);

	// Cloning original user object, to keep real permissions intact
	// to allow further use of the request.
	const clonedUser = _.cloneDeep(user);
	clonedUser.permissions = manipulatePermissions(clonedUser.permissions, resource, action);

	const authenticator: Authenticator = {}
	if (clonedUser.actor === undefined) {
		// this is an apiKey authentication entry
		authenticator.apiKey = clonedUser
	} else {
		// this is an user authentication entry
		authenticator.user = clonedUser
	}

	// Try to read resource with augmented pine permissions
	return api.get({
		resource: resource,
		id: id,
		options: {
			$select: 'id'
		},
		passthrough: {
			req: authenticator
		}
	})
	.then((instance) => {
		instance = instance as AnyObject
		if(instance != null && instance.id == id) {
			// OK
			return;
		}
		throw new UnauthorizedError(`Access to resource for ${action} not allowed`);
	})
	.catch((err) => {
		if (err == 401) {
			throw new UnauthorizedError(`Access to resource for ${action} not allowed`);
		}
		if (_.isNumber(err)) {
			throw new TypedError(`PineAPI threw error number: ${err}`);
		}
		throw err;
	});
}

export function canAccessV1Request(req: express.Request, res: express.Response, next: express.NextFunction): void {
	const url = req.url.split('/')
	const apiRoot = url[1]
	const api = getAPIClient(apiRoot);
	if (api == null)
		return next('route')

	Promise.try( () => {
		const resource: string = _.get(req.body, 'resource');
		const action: string = _.get(req.body, 'action');
		const idString: string = _.get(req.body, 'id');

		if (resource === undefined || action === undefined || idString === undefined) {
			throw new BadInputError('Missing parameters');
		}

		const id: number = parseInt(idString);

		return checkAccessForResourceWithRequest(req, api, resource, action, id);
	})
	.then( () => {
		res.sendStatus(200);
	})
	.catch( (err) => {
		if (err instanceof UnauthorizedError) {
			res.sendStatus(401);
			return;
		}

		if (err instanceof BadInputError) {
			res.sendStatus(400);
			return;
		}

		res.sendStatus(500);
	});
}

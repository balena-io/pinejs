import * as Promise from 'bluebird';
import * as sbvrUtils from './sbvr-utils';
import * as express from 'express';
import { ODataRequest } from './uri-parser';

export type PermissionReq = {
	user?: sbvrUtils.User;
	apiKey?: sbvrUtils.ApiKey;
};

export const root: PermissionReq;
export const rootRead: PermissionReq;

export function checkPassword(
	username: string,
	password: string,
): Promise<{
	id: number;
	actor: number;
	username: string;
	permissions: string[];
}>;
export function getApiKeyPermissions(
	apiKey: string,
	callback?: (err: Error | undefined, permissions: string[]) => void,
): Promise<string[]>;
export function getUserPermissions(
	userId: number,
	callback?: (err: Error | undefined, permissions: string[]) => void,
): Promise<string[]>;
export function apiKeyMiddleware(
	req: sbvrUtils.HookReq | express.Request,
	res?: express.Response,
	next?: express.NextFunction,
): Promise<void>;
export function authorizationMiddleware(
	req: express.Request,
	res?: express.Response,
	next?: express.NextFunction,
): Promise<void>;
export function addPermissions(
	req: PermissionReq,
	res?: ODataRequest,
): Promise<void>;

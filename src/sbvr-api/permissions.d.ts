import * as Promise from 'bluebird'
import * as sbvrUtils from './sbvr-utils'
import * as express from 'express'

export const root: { user: sbvrUtils.User }
export const rootRead: { user: sbvrUtils.User }

export function getUserPermissions(userId: number, callback?: (err: Error | undefined, permissions: string[]) => void): Promise<string[]>;
export function apiKeyMiddleware(req: sbvrUtils.HookReq | express.Request, res?: express.Response, next?: express.NextFunction): Promise<void>;
export function authorizationMiddleware(req: express.Request, res?: express.Response, next?: express.NextFunction): Promise<void>;

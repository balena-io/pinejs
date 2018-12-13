import * as Promise from 'bluebird'
import { Application, RequestHandler } from 'express'
import { WebsocketRequestHandler } from 'express-ws'
import { AbstractSqlQuery, AbstractSqlModel } from '@resin/abstract-sql-compiler';
import { Database, Tx } from '../database-layer/db';
import { PinejsClientCoreFactory } from 'pinejs-client-core';
import { FieldType } from '../../node_modules/@types/mysql';
import { ODataRequest } from './uri-parser';
import { Model } from '../config-loader/config-loader';

export * from './errors';
export * from './permissions';

export { OdataBinds } from './uri-parser'

export const sbvrTypes: {
	Hashed: {
		compare: (str: string, hash: string) => Promise<boolean>
	}
}

export type Passthrough = AnyObject & {
	req?: {
		user?: User,
	},
	tx?: Tx,
}

export interface PinejsClient extends PinejsClientCoreFactory.PinejsClientCore<
	PinejsClient,
	Promise<{}>,
	Promise<PinejsClientCoreFactory.PromiseResultTypes>
> {
	passthrough: Passthrough
}

export type AnyObject = {
	[key: string]: any;
}

export interface Actor {
	permissions?: string[];
}

export interface User extends Actor {
	id: number;
	actor: number;
}

export interface ApiKey extends Actor {
	key: string;
}

export interface HookReq {
	user?: User,
	apiKey?: ApiKey,
	method: string,
	url: string,
	body: AnyObject,
	custom?: AnyObject
}

export type HookRequest = ODataRequest

export interface HookArgs {
	req: HookReq,
	request: HookRequest,
	api: PinejsClient,
	tx?: Tx
}

export type HookResponse = Promise<any> | null | void

export interface Hooks {
	PREPARSE?: (options: HookArgs) => HookResponse
	POSTPARSE?: (options: HookArgs) => HookResponse
	PRERUN?: (options: HookArgs & { tx: Tx }) => HookResponse
	POSTRUN?: (options: HookArgs & { tx: Tx, result: any }) => HookResponse;
	PRERESPOND?: (options: HookArgs & {
		tx: Tx,
		result: any,
		res: any,
		data?: any
	}) => HookResponse
}

export const db: Database

export type LoggingClient = PinejsClient & {
	logger: Console
}

export const api: {
	[ apiName: string ]: LoggingClient
}

type LFModel = Array<LFModel | string>

export function generateLfModel(seModel: string): LFModel
export function generateAbstractSqlModel(lfModel: LFModel): AbstractSqlModel

export function executeModel(tx: Tx, model: Model): Promise<void>
export function executeModels(tx: Tx, models: Model[]): Promise<void>
export const handleODataRequest: RequestHandler
export const handleODataWSRequest: WebsocketRequestHandler
export function getAbstractSqlModel(request: ODataRequest): AbstractSqlModel
export function resolveOdataBind(odataBinds: OdataBinds, value: any): any
export function getAffectedIds(args: { req: HookReq, request: HookRequest, tx: Tx }): Promise<number[]>
export function addPureHook(method: string, vocabulary: string, resource: string, hooks: Hooks): void;
export function addSideEffectHook(method: string, vocabulary: string, resource: string, hooks: Hooks): void;
export function setup(app: Application, db: Database, callback?: (err?: Error) => void): Promise<void>;
export function setupDBTriggers(db: Database): Promise<void>

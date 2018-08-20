import * as Promise from 'bluebird'
import { Application } from 'express'
import { AbstractSqlQuery } from '@resin/abstract-sql-compiler';
import { Database, Tx } from '../database-layer/db';
import { PinejsClientCoreFactory } from 'pinejs-client-core';
import { FieldType } from '../../node_modules/@types/mysql';
export * from './errors';
export * from './permissions';

export interface PinejsClient extends PinejsClientCoreFactory.PinejsClientCore<
	PinejsClient,
	Promise<{}>,
	Promise<number | PinejsClientCoreFactory.AnyObject | PinejsClientCoreFactory.AnyObject[]>
> {}


export type AnyObject = {
	[key: string]: any;
}

export interface User {
	id: number;
	permissions?: string[];
}

export interface HookReq {
	user: User,
	method: string,
	url: string,
	body: AnyObject
}

export interface HookRequest {
	method: string,
	vocabulary: string,
	resourceName: string,
	odataQuery: any,
	abstractSqlQuery: AbstractSqlQuery,
	values: AnyObject,
	custom: AnyObject
}

export interface HookArgs {
	req: HookReq,
	request: HookRequest,
	api: PinejsClient,
	tx?: Tx
}

export interface Hooks {
	PREPARSE?: (options: HookArgs) => Promise<any> | undefined;
	POSTPARSE?: (options: HookArgs) => Promise<any> | undefined;
	PRERUN?: (options: HookArgs & { tx: Tx }) => Promise<any> | undefined;
	POSTRUN?: (options: HookArgs & { tx: Tx, result: any }) => Promise<any> | undefined;
	PRERESPOND?: (options: HookArgs & {
		tx: Tx,
		result: any,
		res: any,
		data?: any
	}) => Promise<any> | undefined;
}

export const db: Database

export const api: {
	[ apiName: string ]: PinejsClient
}

export function getAffectedIds(args: { req: HookReq, request: HookRequest, tx: Tx }): Promise<number[]>
export function addPureHook(method: string, vocabulary: string, resource: string, hooks: Hooks): void;
export function addSideEffectHook(method: string, vocabulary: string, resource: string, hooks: Hooks): void;
export function setup(app: Application, db: Database, callback?: (err?: Error) => void): Promise<void>;

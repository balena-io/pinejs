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
	Promise<PinejsClientCoreFactory.PromiseResultTypes>
> {}

export interface OdataBinds extends Array<any> {
	[ key: string ]: any
}

export type AnyObject = {
	[key: string]: any;
}

export interface User {
	id: number;
	permissions?: string[];
}

export interface HookReq {
	user?: User,
	apiKey?: User,
	method: string,
	url: string,
	body: AnyObject
}

export interface HookRequest {
	method: string,
	vocabulary: string,
	resourceName: string,
	odataQuery: any,
	odataBinds: OdataBinds,
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

type HookResponse = Promise<any> | null | void

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

export function resolveOdataBind(odataBinds: OdataBinds, value: any): any
export function getAffectedIds(args: { req: HookReq, request: HookRequest, tx: Tx }): Promise<number[]>
export function addPureHook(method: string, vocabulary: string, resource: string, hooks: Hooks): void;
export function addSideEffectHook(method: string, vocabulary: string, resource: string, hooks: Hooks): void;
export function setup(app: Application, db: Database, callback?: (err?: Error) => void): Promise<void>;

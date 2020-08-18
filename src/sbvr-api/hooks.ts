import type { Resolvable } from './common-types';
import type { Tx } from '../database-layer/db';
import type { PinejsClient, User, ApiKey } from './sbvr-utils';
import type { ODataRequest } from './uri-parser';
import type { AnyObject } from 'pinejs-client-core';
import type { TypedError } from 'typed-error';

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { settleMapSeries } from './control-flow';

export interface HookReq {
	user?: User;
	apiKey?: ApiKey;
	method: string;
	url: string;
	query: AnyObject;
	params: AnyObject;
	body: AnyObject;
	custom?: AnyObject;
	tx?: Tx;
	hooks?: InstantiatedHooks;
}
export interface HookArgs {
	req: HookReq;
	request: ODataRequest;
	api: PinejsClient;
	tx?: Tx;
}
export type HookResponse = PromiseLike<any> | null | void;

export interface Hooks {
	PREPARSE?: (options: HookArgs) => HookResponse;
	POSTPARSE?: (options: HookArgs) => HookResponse;
	PRERUN?: (options: HookArgs & { tx: Tx }) => HookResponse;
	POSTRUN?: (options: HookArgs & { tx: Tx; result: any }) => HookResponse;
	PRERESPOND?: (
		options: HookArgs & {
			tx: Tx;
			result: any;
			res: any;
			data?: any;
		},
	) => HookResponse;
	'POSTRUN-ERROR'?: (
		options: HookArgs & { error: TypedError | any },
	) => HookResponse;
}
export type HookBlueprints = { [key in keyof Hooks]: HookBlueprint[] };
const hookNames: Array<keyof Hooks> = [
	'PREPARSE',
	'POSTPARSE',
	'PRERUN',
	'POSTRUN',
	'PRERESPOND',
	'POSTRUN-ERROR',
];
export const isValidHook = (x: any): x is keyof Hooks => hookNames.includes(x);

export type RollbackAction = () => Resolvable<void>;
export type HookFn = (...args: any[]) => any;
export interface HookBlueprint {
	HOOK: HookFn;
	effects: boolean;
}
export type InstantiatedHooks = { [key in keyof Hooks]: Hook[] };

export class Hook {
	constructor(private hookFn: HookFn) {}

	public async run(...args: any[]) {
		await this.hookFn(...args);
	}
}

export class SideEffectHook extends Hook {
	private rollbackFns: RollbackAction[] = [];
	private rolledBack: boolean = false;

	constructor(hookFn: HookFn) {
		super(hookFn);
	}

	public registerRollback(fn: RollbackAction): void {
		if (this.rolledBack) {
			Bluebird.try(fn);
		} else {
			this.rollbackFns.push(fn);
		}
	}

	public async rollback() {
		// Don't try to call the rollback functions twice
		if (this.rolledBack) {
			return;
		}
		// set rolledBack to true straight away, so that if any rollback action
		// is registered after the rollback call, we will immediately execute it
		this.rolledBack = true;
		await settleMapSeries(this.rollbackFns, (fn) => fn());
	}
}

// The execution order of rollback actions is unspecified
export const rollbackRequestHooks = <T extends InstantiatedHooks>(
	hooks: T | undefined,
): void => {
	if (hooks == null) {
		return;
	}
	settleMapSeries(_(hooks).flatMap().compact().value(), async (hook) => {
		if (hook instanceof SideEffectHook) {
			await hook.rollback();
		}
	});
};

export const instantiateHooks = <
	T extends { [key in keyof T]: HookBlueprint[] }
>(
	hooks: T,
) =>
	_.mapValues(hooks, (typeHooks) => {
		return typeHooks.map((hook) => {
			if (hook.effects) {
				return new SideEffectHook(hook.HOOK);
			} else {
				return new Hook(hook.HOOK);
			}
		});
	}) as InstantiatedHooks;

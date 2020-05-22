import type { Resolvable } from './common-types';

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { settleMapSeries } from './control-flow';

export type RollbackAction = () => Resolvable<void>;
export type HookFn = (...args: any[]) => any;
export interface HookBlueprint {
	HOOK: HookFn;
	effects: boolean;
}
export type InstantiatedHooks<T extends object> = { [key in keyof T]: Hook[] };

export class Hook {
	constructor(private hookFn: HookFn) {}

	public async run(...args: any[]) {
		return this.hookFn(...args);
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
export const rollbackRequestHooks = <T extends InstantiatedHooks<any>>(
	hooks: T | undefined,
): void => {
	if (hooks == null) {
		return;
	}
	settleMapSeries(_(hooks).flatMap().compact().value(), (hook) => {
		if (hook instanceof SideEffectHook) {
			return hook.rollback();
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
	}) as InstantiatedHooks<T>;

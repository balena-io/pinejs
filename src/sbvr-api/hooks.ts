import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import { settleMapSeries } from './control-flow';
import { Resolvable } from './common-types';

export type RollbackAction = () => Resolvable<void>;
export type HookFn = (...args: any[]) => any;
export type HookBlueprint = {
	HOOK: HookFn;
	effects: boolean;
};
export type InstantiatedHooks<T extends object> = { [key in keyof T]: Hook[] };

export class Hook {
	constructor(private hookFn: HookFn) {}

	run(...args: any[]) {
		return Bluebird.try(() => {
			return this.hookFn(...args);
		});
	}
}

export class SideEffectHook extends Hook {
	private rollbackFns: RollbackAction[] = [];
	private rolledBack: boolean = false;

	constructor(hookFn: HookFn) {
		super(hookFn);
	}

	registerRollback(fn: RollbackAction) {
		if (this.rolledBack) {
			Bluebird.try(fn);
		} else {
			this.rollbackFns.push(fn);
		}
	}

	rollback() {
		// Don't try to call the rollback functions twice
		if (this.rolledBack) {
			return;
		}
		// set rolledBack to true straight away, so that if any rollback action
		// is registered after the rollback call, we will immediately execute it
		this.rolledBack = true;
		return settleMapSeries(this.rollbackFns, fn => fn()).return();
	}
}

// The execution order of rollback actions is unspecified
export const rollbackRequestHooks = <T extends InstantiatedHooks<any>>(
	hooks: T | undefined,
): void => {
	if (hooks == null) {
		return;
	}
	settleMapSeries(
		_(hooks)
			.flatMap()
			.compact()
			.value(),
		hook => {
			if (hook instanceof SideEffectHook) {
				return hook.rollback();
			}
		},
	);
};

export const instantiateHooks = <
	T extends { [key in keyof T]: HookBlueprint[] }
>(
	hooks: T,
) =>
	_.mapValues(hooks, (typeHooks: HookBlueprint[]) => {
		return _.map(typeHooks, (hook: HookBlueprint) => {
			if (hook.effects) {
				return new SideEffectHook(hook.HOOK);
			} else {
				return new Hook(hook.HOOK);
			}
		});
	}) as InstantiatedHooks<T>;

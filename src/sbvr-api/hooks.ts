import * as _ from 'lodash';
import * as Promise from 'bluebird';
import { settleMapSeries } from './control-flow';

export type RollbackAction = () => void | Promise<void>;
export type HookFn = (...args: any[]) => any;
type HookBluePrint = {
	HOOK: HookFn;
	effects: boolean;
};
export class Hook {
	constructor(private hookFn: HookFn) {}

	run(...args: any[]) {
		return Promise.try(() => {
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
			Promise.try(fn);
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
const undoHooks = function(request: any) {
	return settleMapSeries(_.flatten(_.values(request.hooks)), hook => {
		if (hook instanceof SideEffectHook) {
			return hook.rollback();
		}
	});
};

export const rollbackRequestHooks = function(request: any) {
	if (_.isArray(request)) {
		return settleMapSeries(request, undoHooks);
	} else {
		return undoHooks(request);
	}
};

export const instantiateHooks = function(hooks: any) {
	return _.mapValues(hooks, typeHooks => {
		return _.map(typeHooks, (hook: HookBluePrint) => {
			if (hook.effects) {
				return new SideEffectHook(hook.HOOK);
			} else {
				return new Hook(hook.HOOK);
			}
		});
	});
};

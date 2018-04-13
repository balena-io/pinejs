import * as _ from 'lodash'
import * as Promise from 'bluebird'
import * as controlFlow from './control-flow'

type RollbackAction = () => any

export class Hook {
	private hookFn: Function

	constructor(hookFn: Function) {
		this.hookFn = hookFn
	}

	run(...args: any[]) {
		return Promise.try(() => {
			return this.hookFn(...args)
		})
	}
}

export class SideEffectHook extends Hook {
	private rollbackFns: RollbackAction[] = []
	private rolledBack: boolean = false

	constructor(hookFn: () => any) {
		super(hookFn)
	}

	registerRollback(fn: RollbackAction) {
		if (this.rolledBack) {
			Promise.try(fn)
		} else {
			this.rollbackFns.push(fn)
		}
	}

	rollback() {
		// set rolledBack to true straight away, so that if any rollback action
		// is registered after the rollback call, we will immediately execute it
		this.rolledBack = true
		return controlFlow.settleMapSeries(this.rollbackFns, _.attempt).return()
	}
}


// The execution order of rollback actions is unspecified
const undoHooks = function (request: any) {
	return controlFlow.settleMapSeries(_.flatten(_.values(request.hooks)), (hook) => {
		if (hook instanceof SideEffectHook) {
			return hook.rollback()
		}
	})
}

exports.rollbackRequestHooks = function (request: any) {
	if (_.isArray(request)) {
		return controlFlow.settleMapSeries(request, undoHooks)
	} else {
		return undoHooks(request)
	}
}

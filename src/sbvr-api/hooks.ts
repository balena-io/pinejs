import * as _ from 'lodash'
import * as Promise from 'bluebird'
import * as controlFlow from './control-flow'

type RollbackAction = () => any

class Hook {
	hookFn: Function

	constructor(hookFn: Function) {
		this.hookFn = hookFn
	}

	run(...args: any[]) {
		return Promise.try(() => {
			return this.hookFn(...args)
		})
	}
}

class SideEffectHook extends Hook {
	rollbackFns: RollbackAction[]
	rolledBack: boolean

	constructor(hookFn: Function) {
		super(hookFn)
		this.rollbackFns = []
		this.rolledBack = false
	}

	registerRollback(fn: RollbackAction) {
		if (this.rolledBack) {
			Promise.try(fn)
		} else {
			this.rollbackFns.push(fn)
		}
		return
	}

	rollback() {
		// set rolledBack to true straight away, so that if any rollback action
		// is registered after the rollback call, we will immediately execute it
		this.rolledBack = true
		return controlFlow.settleMapSeries(this.rollbackFns, _.attempt)
	}
}


// The execution order of rollback actions is unspecified
const undoHooks = function (request: any) {
	return controlFlow.settleMapSeries(_.flatten(_.values(request.hooks)), function(hook) {
		if (hook instanceof SideEffectHook) {
			return hook.rollback()
		} else {
			return Promise.resolve() as Promise<any>
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

exports.Hook = Hook
exports.SideEffectHook = SideEffectHook

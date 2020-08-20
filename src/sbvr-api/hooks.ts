import type { OptionalField, Resolvable } from './common-types';
import type { Tx } from '../database-layer/db';
import type { ODataRequest } from './uri-parser';
import type { AnyObject } from 'pinejs-client-core';
import type { TypedError } from 'typed-error';
import type { SupportedMethod } from '@balena/odata-to-abstract-sql';

import * as Bluebird from 'bluebird';
import * as _ from 'lodash';
import { settleMapSeries } from './control-flow';
import * as memoize from 'memoizee';
import {
	PinejsClient,
	User,
	ApiKey,
	resolveSynonym,
	getAbstractSqlModel,
	api,
} from './sbvr-utils';

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
	PREPARSE?: (options: Omit<HookArgs, 'request' | 'api'>) => HookResponse;
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
export type HookBlueprints = {
	[key in keyof Hooks]: Array<HookBlueprint<NonNullable<Hooks[key]>>>;
};
const hookNames: Array<keyof Hooks> = [
	'PREPARSE',
	'POSTPARSE',
	'PRERUN',
	'POSTRUN',
	'PRERESPOND',
	'POSTRUN-ERROR',
];
const isValidHook = (x: any): x is keyof Hooks => hookNames.includes(x);

export type RollbackAction = () => Resolvable<void>;
export type HookFn = (...args: any[]) => any;
export interface HookBlueprint<T extends HookFn> {
	hookFn: T;
	sideEffects: boolean;
	readOnlyTx: boolean;
}
export type InstantiatedHooks = {
	[key in keyof Hooks]: Array<Hook<NonNullable<Hooks[key]>>>;
};

class Hook<T extends HookFn> {
	private hookFn: HookBlueprint<T>['hookFn'];
	public readOnlyTx: HookBlueprint<T>['readOnlyTx'];
	constructor(hook: HookBlueprint<T>) {
		this.hookFn = hook.hookFn;
		this.readOnlyTx = hook.readOnlyTx;
	}

	public async run(...args: any[]) {
		await this.hookFn(...args);
	}
}

class SideEffectHook<T extends HookFn> extends Hook<T> {
	private rollbackFns: RollbackAction[] = [];
	private rolledBack: boolean = false;

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

const instantiateHooks = (hooks: HookBlueprints): InstantiatedHooks =>
	_.mapValues(hooks, (typeHooks: Array<HookBlueprint<HookFn>>) => {
		return typeHooks.map((hook) => {
			if (hook.sideEffects) {
				return new SideEffectHook(hook);
			} else {
				return new Hook(hook);
			}
		});
	});

const mergeHooks = (a: HookBlueprints, b: HookBlueprints): HookBlueprints => {
	return _.mergeWith({}, a, b, (x, y) => {
		if (Array.isArray(x)) {
			return x.concat(y);
		}
	});
};
export type HookMethod = keyof typeof apiHooks;
const getResourceHooks = (vocabHooks: VocabHooks, resourceName?: string) => {
	if (vocabHooks == null) {
		return {};
	}
	// When getting the hooks list for the sake of PREPARSE hooks
	// we don't know the resourceName we'll be acting on yet
	if (resourceName == null) {
		return vocabHooks['all'];
	}
	return mergeHooks(vocabHooks[resourceName], vocabHooks['all']);
};
const getVocabHooks = (
	methodHooks: MethodHooks,
	vocabulary: string,
	resourceName?: string,
) => {
	if (methodHooks == null) {
		return {};
	}
	return mergeHooks(
		getResourceHooks(methodHooks[vocabulary], resourceName),
		getResourceHooks(methodHooks['all'], resourceName),
	);
};
const getMethodHooks = memoize(
	(method: SupportedMethod, vocabulary: string, resourceName?: string) =>
		mergeHooks(
			getVocabHooks(apiHooks[method], vocabulary, resourceName),
			getVocabHooks(apiHooks['all'], vocabulary, resourceName),
		),
	{ primitive: true },
);
export const getHooks = (
	request: Pick<
		OptionalField<ODataRequest, 'resourceName'>,
		'resourceName' | 'method' | 'vocabulary'
	>,
): InstantiatedHooks => {
	let { resourceName } = request;
	if (resourceName != null) {
		resourceName = resolveSynonym(
			request as Pick<ODataRequest, 'resourceName' | 'method' | 'vocabulary'>,
		);
	}
	return instantiateHooks(
		getMethodHooks(request.method, request.vocabulary, resourceName),
	);
};
getHooks.clear = () => getMethodHooks.clear();

interface VocabHooks {
	[resourceName: string]: HookBlueprints;
}
interface MethodHooks {
	[vocab: string]: VocabHooks;
}
const apiHooks = {
	all: {} as MethodHooks,
	GET: {} as MethodHooks,
	PUT: {} as MethodHooks,
	POST: {} as MethodHooks,
	PATCH: {} as MethodHooks,
	MERGE: {} as MethodHooks,
	DELETE: {} as MethodHooks,
	OPTIONS: {} as MethodHooks,
};

// Share hooks between merge and patch since they are the same operation,
// just MERGE was the OData intermediary until the HTTP spec added PATCH.
apiHooks.MERGE = apiHooks.PATCH;
export const addHook = (
	method: keyof typeof apiHooks,
	vocabulary: string,
	resourceName: string,
	hooks:
		| { [key in keyof Hooks]: HookBlueprint<NonNullable<Hooks[key]>> }
		| ({ [key in keyof Hooks]: NonNullable<Hooks[key]> } & {
				sideEffects: HookBlueprint<HookFn>['sideEffects'];
				readOnlyTx: HookBlueprint<HookFn>['readOnlyTx'];
		  }),
) => {
	const methodHooks = apiHooks[method];
	if (methodHooks == null) {
		throw new Error('Unsupported method: ' + method);
	}
	if (vocabulary === 'all') {
		if (resourceName !== 'all') {
			throw new Error(
				`When specifying a hook on all apis then you must also specify all resources, got: '${resourceName}'`,
			);
		}
	} else {
		let abstractSqlModel;
		try {
			abstractSqlModel = getAbstractSqlModel({ vocabulary });
		} catch {
			throw new Error('Unknown api root: ' + vocabulary);
		}
		if (resourceName !== 'all') {
			const origResourceName = resourceName;
			resourceName = resolveSynonym({ vocabulary, resourceName });
			if (abstractSqlModel.tables[resourceName] == null) {
				throw new Error(
					'Unknown resource for api root: ' +
						origResourceName +
						', ' +
						vocabulary,
				);
			}
		}
	}

	if (methodHooks[vocabulary] == null) {
		methodHooks[vocabulary] = {};
	}
	const apiRootHooks = methodHooks[vocabulary];
	if (apiRootHooks[resourceName] == null) {
		apiRootHooks[resourceName] = {};
	}

	const resourceHooks = apiRootHooks[resourceName];

	if ('sideEffects' in hooks && 'readOnlyTx' in hooks) {
		const { sideEffects, readOnlyTx } = hooks;
		const blueprintedHooks: {
			[key in keyof Hooks]: HookBlueprint<NonNullable<Hooks[key]>>;
		} = {};
		for (const hookName of hookNames) {
			const hookFn: HookFn | undefined = hooks[hookName];
			if (hookFn != null) {
				blueprintedHooks[hookName] = {
					hookFn,
					sideEffects,
					readOnlyTx,
				};
			}
		}
		hooks = blueprintedHooks;
	}

	for (const hookType of Object.keys(hooks)) {
		if (!isValidHook(hookType)) {
			throw new Error('Unknown callback type: ' + hookType);
		}
		const hook = hooks[hookType];
		if (resourceHooks[hookType] == null) {
			resourceHooks[hookType] = [];
		}
		if (hook != null) {
			resourceHooks[hookType]!.push(hook);
		}
	}

	getHooks.clear();
};

export const addSideEffectHook = (
	method: HookMethod,
	apiRoot: string,
	resourceName: string,
	hooks: Hooks,
): void => {
	addHook(method, apiRoot, resourceName, {
		...hooks,
		sideEffects: true,
		readOnlyTx: false,
	});
};

export const addPureHook = (
	method: HookMethod,
	apiRoot: string,
	resourceName: string,
	hooks: Hooks,
): void => {
	addHook(method, apiRoot, resourceName, {
		...hooks,
		sideEffects: false,
		readOnlyTx: false,
	});
};

const defineApi = (args: HookArgs) => {
	const { request, req, tx } = args;
	const { vocabulary } = request;
	Object.defineProperty(args, 'api', {
		get: _.once(() =>
			api[vocabulary].clone({
				passthrough: { req, tx },
			}),
		),
	});
};

export const runHooks = async <T extends keyof Hooks>(
	hookName: T,
	hooksList: InstantiatedHooks | undefined,
	args: Omit<Parameters<NonNullable<Hooks[T]>>[0], 'api'>,
) => {
	if (hooksList == null) {
		return;
	}
	const hooks = hooksList[hookName];
	if (hooks == null || hooks.length === 0) {
		return;
	}

	let readOnlyArgs: typeof args;
	if (args.tx != null) {
		readOnlyArgs = { ...args, tx: args.tx.asReadOnly() };
	} else {
		// If we don't have a tx then read-only/writable is irrelevant
		readOnlyArgs = args;
	}

	if ((args as HookArgs).request != null) {
		defineApi(args as HookArgs);
		if (args !== readOnlyArgs) {
			// Only try to define a separate read-only api if it's different
			defineApi(readOnlyArgs as HookArgs);
		}
	}

	await Promise.all(
		(hooks as Array<Hook<HookFn>>).map(async (hook) => {
			if (hook.readOnlyTx) {
				await hook.run(readOnlyArgs);
			} else {
				await hook.run(args);
			}
		}),
	);
};

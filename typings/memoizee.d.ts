declare module 'memoizee/weak' {
	import type * as Memoize from 'memoizee';

	type FirstArg<T> = T extends (arg1: infer U) => any ? U : any;
	type RestArgs<T> = T extends (arg1: any, ...args: infer U) => any ? U : any[];

	// tslint:disable-next-line ban-types
	export interface MemoizeWeakOptions<F extends Function> {
		length?: number | false;
		maxAge?: number;
		max?: number;
		preFetch?: number | true;
		promise?: boolean;
		dispose?(value: any): void;
		async?: boolean;
		primitive?: boolean;
		normalizer?(firstArg: FirstArg<F>, restArgs: RestArgs<F>): any;
		resolvers?: Array<(arg: any) => any>;
	}
	// tslint:disable-next-line ban-types
	function memoizeWeak<F extends Function>(
		f: F,
		options?: MemoizeWeakOptions<F>,
	): F & Memoize.Memoized<F>;
	export = memoizeWeak;
}

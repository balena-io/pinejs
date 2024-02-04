export type { AnyObject, Dictionary } from 'pinejs-client-core';

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;
export type RequiredField<T, F extends keyof T> = Overwrite<
	T,
	Required<Pick<T, F>>
>;
export type OptionalField<T, F extends keyof T> = Overwrite<
	T,
	Partial<Pick<T, F>>
>;
export type Resolvable<R> = R | PromiseLike<R>;
export type Tail<T extends any[]> = T extends [any, ...infer U] ? U : never;

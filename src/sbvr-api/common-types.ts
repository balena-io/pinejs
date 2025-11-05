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

/**
 * Ideally this would be a deep readonly but that causes typescript to complain about excessively deep instantiation so a single level is the compromise,
 * meaning that it's actually 1st and 3rd+ level writable
 */
export type ShallowWritableOnly<T> = {
	[P in keyof T]: Readonly<T[P]>;
};

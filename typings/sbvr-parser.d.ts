declare module '@resin/sbvr-parser' {
	export type LFModel = Array<LFModel | string>;
	export const SBVRParser: {
		matchAll: (seModel: string, rule: string) => LFModel;
		_extend<T>(extension: T): typeof SBVRParser & T;
		initialize(): void;
	};
}

declare module '@resin/sbvr-parser' {
	import { ODataQuery, ODataBinds, SupportedMethod } from '@resin/odata-to-abstract-sql'

	export type LFModel = Array<LFModel | string>
	export const SBVRParser: {
		matchAll: (seModel: string, rule: string) => LFModel,
		_extend<T>(extension: T): typeof SBVRParser & T,
		initialize(): void,
	}
}

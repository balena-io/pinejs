declare module '@resin/odata-parser' {
	import {
		ODataQuery,
		ODataBinds,
		SupportedMethod,
	} from '@resin/odata-to-abstract-sql';

	export class SyntaxError extends Error {}
	export function parse(
		url: string,
		opts?: { startRule: string; rule: string },
	): {
		tree: ODataQuery;
		binds: ODataBinds;
	};
}

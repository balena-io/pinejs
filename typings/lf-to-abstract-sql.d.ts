declare module '@balena/lf-to-abstract-sql' {
	import type sbvrTypes = require('@balena/sbvr-types');
	import type { LFModel } from '@balena/sbvr-parser';
	import type { AbstractSqlModel } from '@balena/abstract-sql-compiler';
	export const LF2AbstractSQL: {
		createInstance: () => {
			match: (lfModel: LFModel, rule: 'Process') => AbstractSqlModel;
			addTypes: (types: typeof sbvrTypes) => void;
			reset: () => void;
		};
	};
	export const LF2AbstractSQLPrep: {
		match: (lfModel: LFModel, rule: 'Process') => LFModel;
		_extend({}): typeof LF2AbstractSQLPrep;
	};
	export const createTranslator: (
		types: typeof sbvrTypes,
	) => (lfModel: LFModel, rule: 'Process') => AbstractSqlModel;
}

declare module '@resin/lf-to-abstract-sql' {
	export const LF2AbstractSQL: {
		createInstance: () => {
			match: (
				lfModel: LFModel,
				rule: 'Process',
			) => AbstractSQLCompiler.AbstractSqlModel;
			addTypes: (types: typeof sbvrTypes) => void;
			reset: () => void;
		};
	};
	export const LF2AbstractSQLPrep: {
		match: (lfModel: LFModel, rule: 'Process') => LFModel;
		_extend({}): typeof LF2AbstractSQL.LF2AbstractSQLPrep;
	};
	export const createTranslator: (
		types: typeof sbvrTypes,
	) => (
		lfModel: LFModel,
		rule: 'Process',
	) => AbstractSQLCompiler.AbstractSqlModel;
}

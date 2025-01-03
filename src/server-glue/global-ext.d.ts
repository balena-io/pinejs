// We have to use var when extending the global namespace
// eslint-disable-next-line no-var
declare var nodeRequire: NodeRequire;
declare namespace NodeJS {
	export interface Process {
		browser: boolean;
	}
}

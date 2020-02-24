declare var nodeRequire: NodeRequire;
/* tslint:disable-next-line:no-namespace */
declare namespace NodeJS {
	export interface Process {
		browser: boolean;
	}
	export interface Global {
		nodeRequire: NodeRequire;
	}
}

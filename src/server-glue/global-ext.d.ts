declare var nodeRequire: NodeRequire;
declare namespace NodeJS {
	export interface Process {
		browser: boolean;
	}
	export interface Global {
		nodeRequire: NodeRequire;
	}
}

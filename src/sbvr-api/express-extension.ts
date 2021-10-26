// Augment express.js with pinejs-specific attributes via declaration merging.

// tslint:disable-next-line:no-namespace
declare namespace Express {
	type PineUser = import('./sbvr-utils').User;

	// tslint:disable-next-line:no-empty-interface
	interface User extends PineUser {}
	interface Request {
		user?: User;
		apiKey?: import('./sbvr-utils').ApiKey;
	}
}

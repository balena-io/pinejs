// Augment express.js with pinejs-specific attributes via declaration merging.

// tslint:disable-next-line:no-namespace
declare namespace Express {
	export interface Request {
		apiKey?: import('./sbvr-utils').ApiKey;
	}
}

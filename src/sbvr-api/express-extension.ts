// Augment express.js with pinejs-specific attributes via declaration merging.

// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/no-unused-vars
declare namespace Express {
	type PineUser = import('./sbvr-utils').User;

	// Augment Express.User to include the props of our PineUser.
	// eslint-disable-next-line @typescript-eslint/no-empty-interface
	interface User extends PineUser {}

	interface Request {
		user?: User;
		apiKey?: import('./sbvr-utils').ApiKey;
	}
}

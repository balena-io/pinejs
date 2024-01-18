// Augment express.js with pinejs-specific attributes via declaration merging.

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		type PineUser = import('./sbvr-utils').User;

		// Augment Express.User to include the props of our PineUser.
		// eslint-disable-next-line @typescript-eslint/no-empty-interface
		interface User extends PineUser {}

		interface Request {
			user?: User;
			apiKey?: import('./sbvr-utils').ApiKey;
		}
	}
}

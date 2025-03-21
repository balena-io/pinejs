// Augment express.js with pinejs-specific attributes via declaration merging.
import type { User as PineUser } from './sbvr-utils.js';

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		// Augment Express.User to include the props of our PineUser.
		// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
		interface User extends PineUser {}

		interface Request {
			user?: User;
			apiKey?: import('./sbvr-utils.js').ApiKey;
		}
	}
}

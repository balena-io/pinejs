declare namespace Express {
	export interface Request {
		apiKey?: {
			permissions: string[]
			key: string
		}
	}
}

import * as _pg from 'pg'
// The types don't include log/poolLog for some reason, so we manually type them
declare module 'pg' {
	interface PoolConfig {
		log: Function | false
	}
	interface Defaults {
		poolLog: Function | false
	}
}

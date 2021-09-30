// TODO-MAJOR: Drop the support for the global `DEBUG` env var
const { DEBUG: globalDebug, PINEJS_DEBUG } = process.env;
if (![undefined, '', '0', '1'].includes(PINEJS_DEBUG)) {
	// TODO-MAJOR: Throw on invalid value
	console.warn(`Invalid value for PINE_DEBUG '${PINEJS_DEBUG}'`);
}
// Setting PINEJS_DEBUG to explicitly '0' will disable debug even if global debug is truthy
export const DEBUG =
	PINEJS_DEBUG === '1' || (PINEJS_DEBUG !== '0' && !!globalDebug);

export const cache = {
	permissionsLookup: {
		max: 5000,
	},
	parsePermissions: {
		max: 100000,
	},
	parseOData: {
		max: 100000,
	},
	odataToAbstractSql: {
		max: 10000,
	},
	abstractSqlCompiler: {
		max: 10000,
	},
};

let timeoutMS: number;
if (process.env.TRANSACTION_TIMEOUT_MS) {
	timeoutMS = parseInt(process.env.TRANSACTION_TIMEOUT_MS, 10);
	if (Number.isNaN(timeoutMS) || timeoutMS <= 0) {
		throw new Error(
			`Invalid valid for TRANSACTION_TIMEOUT_MS: ${process.env.TRANSACTION_TIMEOUT_MS}`,
		);
	}
} else {
	timeoutMS = 10000;
}

export const db = {
	poolSize: 50,
	idleTimeoutMillis: 30000 as number | undefined,
	statementTimeout: undefined as number | undefined,
	queryTimeout: undefined as number | undefined,
	connectionTimeoutMillis: 30000 as number | undefined,
	keepAlive: true as boolean | undefined,
	rollbackTimeout: 30000,
	timeoutMS,
};

export const migrator = {
	lockTimeout: 5 * 60 * 1000,
	// Used to delay the failure on lock taking, to avoid spam taking
	lockFailDelay: 20 * 1000,
};

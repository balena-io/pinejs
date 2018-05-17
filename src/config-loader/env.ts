export const apiKeys = {
	permissionsCache: {
		max: 10000,
		maxAge: 5 * 60 * 1000,
	}
}

export const cache = {
	permissionsLookup: {
		max: 5000
	},
	parsePermissions: {
		max: 100000
	},
	parseOData: {
		max: 100000
	},
	odataToAbstractSql: {
		max: 10000
	},
	abstractSqlCompiler: {
		max: 10000
	},
}

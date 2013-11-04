define ->
	return {
		types:
			postgres: 'BYTEA'
			mysql: 'BLOB'
			websql: 'BLOB'
			odata:
				name: 'Edm.String' # TODO: What should this really be?
	}

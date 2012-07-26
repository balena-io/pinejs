define(['underscore'], (_) ->
	
	getField = (table, fieldName) ->
		tableFields = table.fields
		for tableField in tableFields when tableField[1] == fieldName
			return tableField
		return false
	
	splitID = (id) ->
		parts = id.split(',')
		if parts.length == 1
			return parts
		return (part for part in parts[1..] by 2)
	
	return (sqlModel) ->
		tables = sqlModel.tables
		clfTables = {}
		for id, table of tables
			idParts = splitID(id)
			if _.isString(table)
				switch table
					when 'Attribute', 'ForeignKey'
						valueField = tables[idParts[2]].name
					when 'BooleanAttribute'
						valueField = idParts[1]
					else
						throw 'Unrecognised table type'
				baseTable = tables[idParts[0]]
				clfTables[idParts.join(' ')] =
					fields: [ getField(baseTable, baseTable.idField), getField(baseTable, valueField) ]
					idField: baseTable.idField
					valueField: valueField
			else
				clfTables[idParts.join(' ')] = 
					fields: table.fields
					idField: table.idField
					valueField: table.valueField 
		return clfTables
)
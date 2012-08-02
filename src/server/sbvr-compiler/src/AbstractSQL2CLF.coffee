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
		conversions = {}
		for id, table of tables
			idParts = splitID(id)
			newID = (part.replace(/\s/g, '_') for part in idParts).join('-')
			conversions[newID] = {}
			if _.isString(table)
				baseTable = tables[idParts[0]]
				clfTables[newID] =
					fields: [ ['ForeignKey', baseTable.name, 'NOT NULL', baseTable.idField] ]
					idField: baseTable.name
					valueField: baseTable.idField
					actions: ['view', 'add', 'delete']
				conversions[newID][baseTable.idField] = baseTable.name
				switch table
					when 'Attribute', 'ForeignKey'
						clfTables[newID].fields.push(getField(baseTable, tables[idParts[2]].name))
						clfTables[newID].valueField = baseTable.valueField
						conversions[newID][baseTable.valueField] = baseTable.valueField
					when 'BooleanAttribute'
					else
						throw 'Unrecognised table type'
			else
				clfTables[newID] = 
					fields: table.fields
					idField: table.idField
					valueField: table.valueField
					actions: ['view', 'add', 'edit', 'delete']
				for field in clfTables[newID].fields
					conversions[newID][field[1]] = field[1]
		return {tables: clfTables, conversions}
)
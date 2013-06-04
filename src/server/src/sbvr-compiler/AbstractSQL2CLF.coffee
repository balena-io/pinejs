define(['lodash'], (_) ->
	getField = (table, fieldName) ->
		fieldName = fieldName.replace(/_/g, ' ')
		tableFields = table.fields
		for tableField in tableFields when tableField.fieldName == fieldName
			return tableField
		console.error('Cannot find field', table, fieldName)
		throw 'Cannot find field: ' + table.name + ' : ' + fieldName
	
	return (sqlModel) ->
		tables = sqlModel.tables
		resources = {}
		resourceToSQLMappings = {}
		###*
		*	resourceToSQLMappings =
		*		[resourceName][resourceField] = [sqlTableName, sqlFieldName]
		###
		addMapping = (resourceName, resourceField, sqlTableName, sqlFieldName) ->
			resourceToSQLMappings[resourceName][resourceField] = [sqlTableName, sqlFieldName]
		for resourceName, table of tables when table.exists != false
			idParts = resourceName.split('-')
			resourceName = (
				for idPart in idParts
					idPart.split(/[ -]/).join('_')
			).join('__')
			resourceToSQLMappings[resourceName] = {}
			if _.isString(table)
				sqlTable = tables[idParts[0]]
				resourceToSQLMappings[resourceName]._name = sqlTable.name
				sqlFieldName = sqlTable.idField
				resourceField = sqlTableName = sqlTable.name
				addMapping(resourceName, resourceField, sqlTableName, sqlFieldName)
				resources[resourceName] =
					resourceName: resourceName
					modelName: (part.replace(/_/g, ' ') for part in idParts).join(' ')
					topLevel: idParts.length == 1
					fields: [
						dataType: 'ForeignKey'
						fieldName: resourceField
						required: true
						index: null
						references:
							tableName: sqlTableName
							fieldName: sqlFieldName
					]
					idField: resourceField
					referenceScheme: resourceField
					actions: ['view', 'add', 'delete']
				switch table
					when 'Attribute', 'ForeignKey'
						# person has age
						# person: fk - id
						# age: fk
						resourceField = sqlFieldName = idParts[2].replace(/_/g, ' ')
						sqlTableName = sqlTable.name
						addMapping(resourceName, resourceField, sqlTableName, sqlFieldName)
						resources[resourceName].fields.push(getField(sqlTable, sqlFieldName))
						resources[resourceName].referenceScheme = resourceField
					when 'BooleanAttribute'
						# person is old
						# person: fk - id
						# is old: boolean
						resourceField = sqlFieldName = idParts[1].replace(/_/g, ' ')
						sqlTableName = sqlTable.name
						addMapping(resourceName, resourceField, sqlTableName, sqlFieldName)
						resources[resourceName].fields.push(getField(sqlTable, sqlFieldName))
						resources[resourceName].referenceScheme = resourceField
					else
						throw 'Unrecognised table type'
			else
				resourceToSQLMappings[resourceName]._name = table.name
				resources[resourceName] =
					resourceName: resourceName
					modelName: (part.replace(/_/g, ' ') for part in idParts).join(' ')
					topLevel: idParts.length == 1
					fields: table.fields
					idField: table.idField
					referenceScheme: table.referenceScheme
					actions: ['view', 'add', 'edit', 'delete']
				for {fieldName} in table.fields
					addMapping(resourceName, fieldName.replace(/\ /g, '_'), table.name, fieldName)
		return {resources, resourceToSQLMappings}
)

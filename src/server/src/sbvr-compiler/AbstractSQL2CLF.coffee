define(->
	_ = require('underscore')

	getField = (table, fieldName) ->
		tableFields = table.fields
		for tableField in tableFields when tableField.fieldName == fieldName
			return tableField
		return false
	
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
			resourceToSQLMappings[resourceName] = {}
			if _.isString(table)
				sqlTable = tables[idParts[0]]
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
						resourceField = sqlFieldName = tables[idParts[2]].name
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
				resources[resourceName] =
					resourceName: resourceName
					modelName: (part.replace(/_/g, ' ') for part in idParts).join(' ')
					topLevel: idParts.length == 1
					fields: table.fields
					idField: table.idField
					referenceScheme: table.referenceScheme
					actions: ['view', 'add', 'edit', 'delete']
				for {fieldName} in table.fields
					addMapping(resourceName, fieldName, table.name, fieldName)
		return {resources, resourceToSQLMappings}
)

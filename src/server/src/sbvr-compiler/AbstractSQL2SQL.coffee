define([
	'ometa!sbvr-compiler/AbstractSQLRules2SQL'
	'ometa!sbvr-compiler/AbstractSQLOptimiser'
	'lodash'
	'cs!sbvr-compiler/types'
	'cs!sbvr-compiler/types/TypeUtils'
], (AbstractSQLRules2SQL, AbstractSQLOptimiser, _, sbvrTypes, TypeUtils) ->

	dataTypeValidate = (value, field, callback) ->
		{dataType, required} = field
		if value == null or value == ''
			if required
				callback('cannot be null')
			else
				callback(null, null)
		else if sbvrTypes[dataType]?
			sbvrTypes[dataType].validate(value, required, callback)
			return
		else if dataType in ['ForeignKey', 'ConceptType']
			TypeUtils.validate.integer(value, required, callback)
		else
			callback('is an unsupported type: ' + dataType)
	
	dataTypeGen = (engine) ->
		(dataType, necessity, index = '') ->
			necessity = if necessity then ' NOT NULL' else ' NULL'
			if index != ''
				index = ' ' + index
			if dataType in ['ForeignKey', 'ConceptType']
				return 'INTEGER' + necessity + index
			else if sbvrTypes[dataType]?.types?[engine]?
				if _.isFunction(sbvrTypes[dataType].types[engine])
					return sbvrTypes[dataType].types[engine](necessity, index)
				return sbvrTypes[dataType].types[engine] + necessity + index
			else
				throw 'Unknown data type "' + dataType + '" for engine: ' + engine
	
	generate = (sqlModel, dataTypeGen, ifNotExists) ->
		ifNotExists = if ifNotExists then 'IF NOT EXISTS ' else ''
		hasDependants = {}
		schemaDependencyMap = {}
		for own resourceName, table of sqlModel.tables when !_.isString(table) # and table.primitive is false
			foreignKeys = []
			depends = []
			dropSQL = 'DROP TABLE "' + table.name + '";'
			createSQL = 'CREATE TABLE ' + ifNotExists + '"' + table.name + '" (\n\t'
			
			for {dataType, fieldName, required, index, references} in table.fields
				createSQL += '"' + fieldName + '" ' + dataTypeGen(dataType, required, index) + '\n,\t'
				if dataType in ['ForeignKey', 'ConceptType']
					foreignKeys.push({fieldName, references})
					depends.push(references.tableName)
					hasDependants[references.tableName] = true
				
			for foreignKey in foreignKeys
				createSQL += 'FOREIGN KEY ("' + foreignKey.fieldName + '") REFERENCES "' + foreignKey.references.tableName + '" ("' + foreignKey.references.fieldName + '")' + '\n,\t'
			createSQL = createSQL[0...-2] + ');'
			schemaDependencyMap[table.name] = {
				resourceName: resourceName
				primitive: table.primitive
				createSQL: createSQL
				dropSQL: dropSQL
				depends: depends
			}

		createSchemaStatements = []
		dropSchemaStatements = []
		tableNames = []
		while tableNames.length != (tableNames = Object.keys(schemaDependencyMap)).length && tableNames.length > 0
			for tableName in tableNames
				schemaInfo = schemaDependencyMap[tableName]
				unsolvedDependency = false
				for dependency in schemaInfo.depends when dependency != schemaInfo.resourceName # Self-dependencies are ok.
					if schemaDependencyMap.hasOwnProperty(dependency)
						unsolvedDependency = true
						break
				if unsolvedDependency == false
					if sqlModel.tables[schemaInfo.resourceName].exists = (schemaInfo.primitive == false || hasDependants[tableName]?)
						if schemaInfo.primitive != false
							console.warn("We're adding a primitive table??", schemaInfo.resourceName)
						createSchemaStatements.push(schemaInfo.createSQL)
						dropSchemaStatements.push(schemaInfo.dropSQL)
						console.log(schemaInfo.createSQL)
					delete schemaDependencyMap[tableName]
		if schemaDependencyMap.length > 0
			console.error('Failed to resolve all schema dependencies', schemaDependencyMap)
			throw 'Failed to resolve all schema dependencies'
		dropSchemaStatements = dropSchemaStatements.reverse()
		
		try
			# console.log('rules', sqlModel.rules)
			for rule in sqlModel.rules
				instance = AbstractSQLOptimiser.createInstance()
				rule[2][1] = instance.match(
					rule[2][1]
					, 'Process'
				)
		catch e
			console.error(rule[2][1])
			console.error(rule)
			console.error(e)
			console.error(instance.input)
			throw e
		
		ruleStatements = []
		try
			for rule in sqlModel.rules
				console.log(rule[1][1])
				instance = AbstractSQLRules2SQL.createInstance()
				ruleSQL = instance.match(
					rule[2][1]
					, 'Process'
				)
				console.log(ruleSQL)
				ruleStatements.push({structuredEnglish: rule[1][1], sql: ruleSQL})
		catch e
			console.error(rule)
			console.error(e)
			console.error(instance.input)
			throw e
			
			# console.log(ruleSQL)
			
		return {tables: sqlModel.tables, createSchema: createSchemaStatements, dropSchema: dropSchemaStatements, rules: ruleStatements}


	return {
		websql: 
			generate: (sqlModel) -> generate(sqlModel, dataTypeGen('websql'), false)
			dataTypeValidate: dataTypeValidate
		postgres: 
			generate: (sqlModel) -> generate(sqlModel, dataTypeGen('postgres'), true)
			dataTypeValidate: dataTypeValidate
		mysql: 
			generate: (sqlModel) -> generate(sqlModel, dataTypeGen('mysql'), true)
			dataTypeValidate: dataTypeValidate
	}


















)




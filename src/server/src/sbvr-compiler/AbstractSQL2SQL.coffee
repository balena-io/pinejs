define([
	'ometa!sbvr-compiler/AbstractSQLRules2SQL'
	'ometa!sbvr-compiler/AbstractSQLOptimiser'
	'ometa!prettify/Prettify'
	'underscore'
	'cs!sbvr-compiler/types'
	'cs!sbvr-compiler/types/TypeUtils'
], (AbstractSQLRules2SQL, AbstractSQLOptimiser, Prettify, _, sbvrTypes, TypeUtils) ->

	dataTypeValidate = (originalValue, field, callback) ->
		value = originalValue
		validationError = false
		if value == null or value == ''
			value = null
			if field[2] == true
				validationError = 'cannot be null'
		else
			typeName = field[0]
			switch typeName
				when 'ForeignKey', 'ConceptType'
					TypeUtils.validate.integer(value, field[2], callback)
					return
				else
					if sbvrTypes[typeName]?
						sbvrTypes[typeName].validate(value, field[2], callback)
						return
					else
						validationError = 'is an unsupported type: ' + typeName
		callback(validationError, value)
	
	postgresDataType = (dataType, necessity, index = '') ->
		necessity = if necessity then ' NOT NULL' else ' NULL'
		if index != ''
			index = ' ' + index
		switch dataType
			when 'ForeignKey', 'ConceptType'
				return 'INTEGER' + necessity + index
			else
				if sbvrTypes[dataType]?.types?.postgres?
					if _.isFunction(sbvrTypes[dataType].types.postgres)
						return sbvrTypes[dataType].types.postgres(necessity, index)
					return sbvrTypes[dataType].types.postgres + necessity + index
				return 'VARCHAR(100)' + necessity + index
	
	mysqlDataType = (dataType, necessity, index = '') ->
		necessity = if necessity then ' NOT NULL' else ' NULL'
		if index != ''
			index = ' ' + index
		switch dataType
			when 'ForeignKey', 'ConceptType'
				return 'INTEGER' + necessity + index
			else
				if sbvrTypes[dataType]?.types?.mysql?
					if _.isFunction(sbvrTypes[dataType].types.mysql)
						return sbvrTypes[dataType].types.mysql(necessity, index)
					return sbvrTypes[dataType].types.mysql + necessity + index
				return 'VARCHAR(100)' + necessity + index
	
	websqlDataType = (dataType, necessity, index = '') ->
		necessity = if necessity then ' NOT NULL' else ' NULL'
		if index != ''
			index = ' ' + index
		switch dataType
			when 'ForeignKey', 'ConceptType'
				return 'INTEGER' + necessity + index
			else
				if sbvrTypes[dataType]?.types?.websql?
					if _.isFunction(sbvrTypes[dataType].types.websql)
						return sbvrTypes[dataType].types.websql(necessity, index)
					return sbvrTypes[dataType].types.websql + necessity + index
				return 'VARCHAR(100)' + necessity + index
	
	generate = (sqlModel, dataTypeGen, ifNotExists) ->
		ifNotExists = if ifNotExists then 'IF NOT EXISTS ' else ''
		hasDependants = {}
		schemaDependencyMap = {}
		for own resourceName, table of sqlModel.tables when !_.isString(table) # and table.primitive is false
			foreignKeys = []
			depends = []
			dropSQL = 'DROP TABLE "' + table.name + '";'
			createSQL = 'CREATE TABLE ' + ifNotExists + '"' + table.name + '" (\n\t'
			
			for field in table.fields
				createSQL += '"' + field[1] + '" ' + dataTypeGen(field[0], field[2], field[3]) + '\n,\t'
				if field[0] in ['ForeignKey', 'ConceptType']
					foreignKeys.push([field[1]].concat(field[4]))
					depends.push(field[4][0])
					hasDependants[field[4][0]] = true
				
			for foreignKey in foreignKeys
				createSQL += 'FOREIGN KEY ("' + foreignKey[0] + '") REFERENCES "' + foreignKey[1] + '" ("' + foreignKey[2] + '")' + '\n,\t'
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
			console.error(e)
			console.error(instance.input)
			throw e
		
		ruleStatements = []
		try
			for rule in sqlModel.rules
				# console.log(Prettify.match(rule[2][1], 'Process'))
				instance = AbstractSQLRules2SQL.createInstance()
				ruleSQL = instance.match(
					rule[2][1]
					, 'Process'
				)
				console.log(rule[1][1])
				console.log(ruleSQL)
				ruleStatements.push({structuredEnglish: rule[1][1], sql: ruleSQL})
		catch e
			console.error(e)
			console.error(instance.input)
			throw e
			
			# console.log(ruleSQL)
			
		return {tables: sqlModel.tables, createSchema: createSchemaStatements, dropSchema: dropSchemaStatements, rules: ruleStatements}


	return {
		websql: 
			generate: (sqlModel) -> generate(sqlModel, websqlDataType, false)
			dataTypeValidate: dataTypeValidate
		postgres: 
			generate: (sqlModel) -> generate(sqlModel, postgresDataType, true)
			dataTypeValidate: dataTypeValidate
		mysql: 
			generate: (sqlModel) -> generate(sqlModel, mysqlDataType, true)
			dataTypeValidate: dataTypeValidate
	}


















)




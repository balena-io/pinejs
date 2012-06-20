define(['sbvr-compiler/AbstractSQLRules2SQL', 'sbvr-compiler/AbstractSQLOptimiser', 'Prettify', 'underscore'], (AbstractSQLRules2SQL, AbstractSQLOptimiser, Prettify, _) ->
	
	postgresDataType = (dataType, necessity) ->
		switch dataType
			when 'PrimaryKey'
				return 'SERIAL PRIMARY KEY'
			when 'Integer'
				return 'INTEGER ' + necessity
			when 'Short Text'
				return 'varchar(20) ' + necessity
			when 'Long Text'
				return 'varchar(200) ' + necessity
			when 'Boolean'
				return 'INTEGER NOT NULL DEFAULT 0'
			when 'ForeignKey', 'ConceptType'
				return 'INTEGER ' + necessity
			else
				return 'VARCHAR(100)'
	
	websqlDataType = (dataType, necessity) ->
		switch dataType
			when 'PrimaryKey'
				return 'INTEGER PRIMARY KEY AUTOINCREMENT'
			when 'Integer'
				return 'INTEGER ' + necessity
			when 'Short Text'
				return 'varchar(20) ' + necessity
			when 'Long Text'
				return 'varchar(200) ' + necessity
			when 'Boolean'
				return 'INTEGER NOT NULL DEFAULT 0'
			when 'ForeignKey', 'ConceptType'
				return 'INTEGER ' + necessity
			else
				return 'VARCHAR(100)'
	
	generate = (sqlModel, dataTypeGen) ->
		schemaDependencyMap = {}
		for own key, table of sqlModel.tables when !_.isString(table) # and table.primitive is false
			foreignKeys = []
			depends = []
			dropSQL = 'DROP TABLE "' + table.name + '";'
			createSQL = 'CREATE TABLE "' + table.name + '" (\n\t'
			
			for field in table.fields
				createSQL += '"' + field[1] + '" ' + dataTypeGen(field[0], field[2]) + '\n,\t'
				
				if field[0] in ['ForeignKey', 'ConceptType']
					foreignKeys.push([field[1], field[3]])
					depends.push(field[1])
				
			for foreignKey in foreignKeys
				createSQL += 'FOREIGN KEY ("' + foreignKey[0] + '") REFERENCES "' + foreignKey[0] + '" ("' + foreignKey[1] + '")' + '\n,\t'
			createSQL = createSQL[0...-2] + ');'
			schemaDependencyMap[table.name] = {
				createSQL: createSQL
				dropSQL: dropSQL
				depends: depends
			}

		createSchemaStatements = []
		dropSchemaStatements = []
		tableNames = []
		while tableNames.length != (tableNames = Object.keys(schemaDependencyMap)).length && tableNames.length > 0
			for tableName in tableNames
				unsolvedDependency = false
				for dependency in schemaDependencyMap[tableName].depends
					if schemaDependencyMap.hasOwnProperty(dependency)
						unsolvedDependency = true
						break
				if unsolvedDependency == false
					createSchemaStatements.push(schemaDependencyMap[tableName].createSQL)
					dropSchemaStatements.push(schemaDependencyMap[tableName].dropSQL)
					console.log(schemaDependencyMap[tableName].createSQL)
					delete schemaDependencyMap[tableName]
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
			console.log(e)
			console.log(instance.input)
		
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
			console.log(e)
			console.log(instance.input)
			
			# console.log(ruleSQL)
			
		return {tables: sqlModel.tables, createSchema: createSchemaStatements, dropSchema: dropSchemaStatements, rules: ruleStatements}


	return {
		websql: (sqlModel) -> generate(sqlModel, websqlDataType),
		postgres: (sqlModel) -> generate(sqlModel, postgresDataType)
	}


















)




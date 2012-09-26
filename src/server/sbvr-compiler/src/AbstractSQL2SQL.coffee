define(['sbvr-compiler/AbstractSQLRules2SQL', 'sbvr-compiler/AbstractSQLOptimiser', 'Prettify', 'underscore'], (AbstractSQLRules2SQL, AbstractSQLOptimiser, Prettify, _) ->
	
	dataTypeValidate = (originalValue, field) ->
		value = originalValue
		validated = true
		if value == null || value == ''
			switch field[2]
				when 'PRIMARY KEY', 'NOT NULL'
					validated = 'cannot be null'
		else
			switch field[0]
				when 'Serial', 'Integer', 'ForeignKey', 'ConceptType'
					value = parseInt(value, 10)
					if _.isNaN(value)
						validated = 'is not a number: ' + originalValue
				when 'Date', 'Date Time', 'Time'
					value = Date.parse(value)
					if _.isNaN(value)
						validated = 'is not a ' + field[0] + ': ' + originalValue
				when 'Interval'
					value = parseInt(value, 10)
					if _.isNaN(value)
						validated = 'is not a number: ' + originalValue
				when 'Real'
					value = parseFloat(value)
					if _.isNaN(value)
						validated = 'is not a number: ' + originalValue
				when 'Short Text'
					if !_.isString(value)
						validated = 'is not a string: ' + originalValue
					else if value.length > 255
						validated = 'longer than 255 characters (' + value.length + ')'
				when 'Long Text'
					if !_.isString(value)
						validated = 'is not a string: ' + originalValue
				when 'JSON'
					try
						value = JSON.stringify(value)
					catch e
						validated = 'cannot be turned into JSON: ' + originalValue
				when 'Boolean'
					value = parseInt(value, 10)
					if _.isNaN(value) || (value not in [0, 1])
						validated = 'is not a boolean: ' + originalValue
				when 'Hashed'
					if !_.isString(value)
						validated = 'is not a string'
					else if window? && window == (()->this)()
						# Warning: If we're running in the browser then store unencrypted (no bcrypt module available)
						if value.length > 60
							validated = 'longer than 60 characters (' + value.length + ')'
					else
						bcrypt = require('bcrypt')
						salt = bcrypt.genSaltSync()
						value = bcrypt.hashSync(value, salt)
				else
					if !_.isString(value)
						validated = 'is not a string: ' + originalValue
					else if value.length > 100
						validated = 'longer than 100 characters (' + value.length + ')'
		return {validated, value}
	
	postgresDataType = (dataType, necessity) ->
		switch dataType
			when 'Serial'
				return 'SERIAL ' + necessity
			when 'Date'
				return 'DATE ' + necessity
			when 'Date Time'
				return 'TIMESTAMP ' + necessity
			when 'Time'
				return 'TIME ' + necessity
			when 'Interval'
				return 'INTERVAL ' + necessity
			when 'Real'
				return 'REAL ' + necessity
			when 'Integer', 'ForeignKey', 'ConceptType'
				return 'INTEGER ' + necessity
			when 'Short Text'
				return 'VARCHAR(255) ' + necessity
			when 'Long Text', 'JSON'
				return 'TEXT ' + necessity
			when 'Boolean'
				return 'INTEGER NOT NULL DEFAULT 0'
			when 'Hashed'
				return 'CHAR(60) ' + necessity
			when 'Value'
				return 'VARCHAR(100) NOT NULL'
			else
				return 'VARCHAR(100)'
	
	mysqlDataType = (dataType, necessity) ->
		switch dataType
			when 'Serial'
				return 'INTEGER ' + necessity + ' AUTO_INCREMENT'
			when 'Date'
				return 'DATE ' + necessity
			when 'Date Time'
				return 'TIMESTAMP ' + necessity
			when 'Time'
				return 'TIME ' + necessity
			when 'Interval'
				return 'INTEGER ' + necessity
			when 'Real'
				return 'REAL ' + necessity
			when 'Integer', 'ForeignKey', 'ConceptType'
				return 'INTEGER ' + necessity
			when 'Short Text'
				return 'VARCHAR(255) ' + necessity
			when 'Long Text', 'JSON'
				return 'TEXT ' + necessity
			when 'Boolean'
				return 'INTEGER NOT NULL DEFAULT 0'
			when 'Hashed'
				return 'CHAR(60) ' + necessity
			when 'Value'
				return 'VARCHAR(100) NOT NULL'
			else
				return 'VARCHAR(100)'
	
	websqlDataType = (dataType, necessity) ->
		switch dataType
			when 'Serial'
				return 'INTEGER ' + necessity + ' AUTOINCREMENT'
			when 'Date'
				return 'TEXT ' + necessity
			when 'Date Time'
				return 'TEXT ' + necessity
			when 'Time'
				return 'TEXT ' + necessity
			when 'Interval'
				return 'INTEGER ' + necessity
			when 'Real'
				return 'REAL ' + necessity
			when 'Integer', 'ForeignKey', 'ConceptType'
				return 'INTEGER ' + necessity
			when 'Short Text'
				return 'VARCHAR(255) ' + necessity
			when 'Long Text', 'JSON'
				return 'TEXT ' + necessity
			when 'Boolean'
				return 'INTEGER NOT NULL DEFAULT 0'
			when 'Hashed'
				return 'CHAR(60) ' + necessity
			when 'Value'
				return 'VARCHAR(100) ' + necessity
			else
				return 'VARCHAR(100)'
	
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
				createSQL += '"' + field[1] + '" ' + dataTypeGen(field[0], field[2]) + '\n,\t'
				
				if field[0] in ['ForeignKey', 'ConceptType']
					foreignKeys.push([field[1], field[3]])
					depends.push(field[1])
					hasDependants[field[1]] = true
				
			for foreignKey in foreignKeys
				createSQL += 'FOREIGN KEY ("' + foreignKey[0] + '") REFERENCES "' + foreignKey[0] + '" ("' + foreignKey[1] + '")' + '\n,\t'
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
				for dependency in schemaInfo.depends
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




(function() {
  var __hasProp = Object.prototype.hasOwnProperty;

  define(['sbvr-compiler/AbstractSQLRules2SQL', 'sbvr-compiler/AbstractSQLOptimiser', 'Prettify', 'underscore'], function(AbstractSQLRules2SQL, AbstractSQLOptimiser, Prettify, _) {
    var generate, postgresDataType, websqlDataType;
    postgresDataType = function(dataType, necessity) {
      switch (dataType) {
        case 'PrimaryKey':
          return 'SERIAL PRIMARY KEY';
        case 'Integer':
          return 'INTEGER ' + necessity;
        case 'Short Text':
          return 'VARCHAR(20) ' + necessity;
        case 'Long Text':
          return 'VARCHAR(200) ' + necessity;
        case 'Boolean':
          return 'INTEGER NOT NULL DEFAULT 0';
        case 'ForeignKey':
        case 'ConceptType':
          return 'INTEGER ' + necessity;
        case 'Value':
          return 'VARCHAR(100) NOT NULL';
        default:
          return 'VARCHAR(100)';
      }
    };
    websqlDataType = function(dataType, necessity) {
      switch (dataType) {
        case 'PrimaryKey':
          return 'INTEGER PRIMARY KEY AUTOINCREMENT';
        case 'Integer':
          return 'INTEGER ' + necessity;
        case 'Short Text':
          return 'VARCHAR(20) ' + necessity;
        case 'Long Text':
          return 'VARCHAR(200) ' + necessity;
        case 'Boolean':
          return 'INTEGER NOT NULL DEFAULT 0';
        case 'ForeignKey':
        case 'ConceptType':
          return 'INTEGER ' + necessity;
        case 'Value':
          return 'VARCHAR(100)' + necessity;
        default:
          return 'VARCHAR(100)';
      }
    };
    generate = function(sqlModel, dataTypeGen) {
      var createSQL, createSchemaStatements, dependency, depends, dropSQL, dropSchemaStatements, field, foreignKey, foreignKeys, instance, key, rule, ruleSQL, ruleStatements, schemaDependencyMap, table, tableName, tableNames, unsolvedDependency, _i, _j, _k, _l, _len, _len2, _len3, _len4, _len5, _len6, _m, _n, _ref, _ref2, _ref3, _ref4, _ref5, _ref6;
      schemaDependencyMap = {};
      _ref = sqlModel.tables;
      for (key in _ref) {
        if (!__hasProp.call(_ref, key)) continue;
        table = _ref[key];
        if (!(!_.isString(table))) continue;
        foreignKeys = [];
        depends = [];
        dropSQL = 'DROP TABLE "' + table.name + '";';
        createSQL = 'CREATE TABLE "' + table.name + '" (\n\t';
        _ref2 = table.fields;
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          field = _ref2[_i];
          createSQL += '"' + field[1] + '" ' + dataTypeGen(field[0], field[2]) + '\n,\t';
          if ((_ref3 = field[0]) === 'ForeignKey' || _ref3 === 'ConceptType') {
            foreignKeys.push([field[1], field[3]]);
            depends.push(field[1]);
          }
        }
        for (_j = 0, _len2 = foreignKeys.length; _j < _len2; _j++) {
          foreignKey = foreignKeys[_j];
          createSQL += 'FOREIGN KEY ("' + foreignKey[0] + '") REFERENCES "' + foreignKey[0] + '" ("' + foreignKey[1] + '")' + '\n,\t';
        }
        createSQL = createSQL.slice(0, -2) + ');';
        schemaDependencyMap[table.name] = {
          createSQL: createSQL,
          dropSQL: dropSQL,
          depends: depends
        };
      }
      createSchemaStatements = [];
      dropSchemaStatements = [];
      tableNames = [];
      while (tableNames.length !== (tableNames = Object.keys(schemaDependencyMap)).length && tableNames.length > 0) {
        for (_k = 0, _len3 = tableNames.length; _k < _len3; _k++) {
          tableName = tableNames[_k];
          unsolvedDependency = false;
          _ref4 = schemaDependencyMap[tableName].depends;
          for (_l = 0, _len4 = _ref4.length; _l < _len4; _l++) {
            dependency = _ref4[_l];
            if (schemaDependencyMap.hasOwnProperty(dependency)) {
              unsolvedDependency = true;
              break;
            }
          }
          if (unsolvedDependency === false) {
            createSchemaStatements.push(schemaDependencyMap[tableName].createSQL);
            dropSchemaStatements.push(schemaDependencyMap[tableName].dropSQL);
            console.log(schemaDependencyMap[tableName].createSQL);
            delete schemaDependencyMap[tableName];
          }
        }
      }
      dropSchemaStatements = dropSchemaStatements.reverse();
      try {
        _ref5 = sqlModel.rules;
        for (_m = 0, _len5 = _ref5.length; _m < _len5; _m++) {
          rule = _ref5[_m];
          instance = AbstractSQLOptimiser.createInstance();
          rule[2][1] = instance.match(rule[2][1], 'Process');
        }
      } catch (e) {
        console.log(e);
        console.log(instance.input);
      }
      ruleStatements = [];
      try {
        _ref6 = sqlModel.rules;
        for (_n = 0, _len6 = _ref6.length; _n < _len6; _n++) {
          rule = _ref6[_n];
          instance = AbstractSQLRules2SQL.createInstance();
          ruleSQL = instance.match(rule[2][1], 'Process');
          console.log(rule[1][1]);
          console.log(ruleSQL);
          ruleStatements.push({
            structuredEnglish: rule[1][1],
            sql: ruleSQL
          });
        }
      } catch (e) {
        console.log(e);
        console.log(instance.input);
      }
      return {
        tables: sqlModel.tables,
        createSchema: createSchemaStatements,
        dropSchema: dropSchemaStatements,
        rules: ruleStatements
      };
    };
    return {
      websql: function(sqlModel) {
        return generate(sqlModel, websqlDataType);
      },
      postgres: function(sqlModel) {
        return generate(sqlModel, postgresDataType);
      }
    };
  });

}).call(this);

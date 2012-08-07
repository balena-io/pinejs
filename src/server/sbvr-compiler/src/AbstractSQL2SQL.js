(function() {
  var __hasProp = Object.prototype.hasOwnProperty;

  define(['sbvr-compiler/AbstractSQLRules2SQL', 'sbvr-compiler/AbstractSQLOptimiser', 'Prettify', 'underscore'], function(AbstractSQLRules2SQL, AbstractSQLOptimiser, Prettify, _) {
    var dataTypeValidate, generate, postgresDataType, websqlDataType;
    dataTypeValidate = function(originalValue, field) {
      var validated, value;
      value = originalValue;
      validated = true;
      if (value === null) {
        switch (field[2]) {
          case 'PRIMARY KEY':
          case 'NOT NULL':
            validated = 'cannot be null';
        }
      } else {
        switch (field[0]) {
          case 'Serial':
          case 'Integer':
          case 'ForeignKey':
          case 'ConceptType':
            value = parseInt(value, 10);
            if (_.isNaN(value)) validated = 'is not a number: ' + originalValue;
            break;
          case 'Real':
            value = parseFloat(value);
            if (_.isNaN(value)) validated = 'is not a number: ' + originalValue;
            break;
          case 'Short Text':
            if (!_.isString(value)) {
              validated = 'is not a string: ' + originalValue;
            } else if (value.length > 20) {
              validated = 'longer than 20 characters (' + value.length + ')';
            }
            break;
          case 'Long Text':
            if (!_.isString(value)) {
              validated = 'is not a string: ' + originalValue;
            }
            break;
          case 'Boolean':
            value = parseInt(value, 10);
            if (_.isNaN(value) || (value !== 0 && value !== 1)) {
              validated = 'is not a boolean: ' + originalValue;
            }
            break;
          default:
            if (!_.isString(value)) {
              validated = 'is not a string: ' + originalValue;
            } else if (value.length > 100) {
              validated = 'longer than 100 characters (' + value.length + ')';
            }
        }
      }
      return {
        validated: validated,
        value: value
      };
    };
    postgresDataType = function(dataType, necessity) {
      switch (dataType) {
        case 'Serial':
          return 'SERIAL ' + necessity;
        case 'Real':
          return 'REAL ' + necessity;
        case 'Integer':
        case 'ForeignKey':
        case 'ConceptType':
          return 'INTEGER ' + necessity;
        case 'Short Text':
          return 'VARCHAR(20) ' + necessity;
        case 'Long Text':
          return 'TEXT ' + necessity;
        case 'Boolean':
          return 'INTEGER NOT NULL DEFAULT 0';
        case 'Value':
          return 'VARCHAR(100) NOT NULL';
        default:
          return 'VARCHAR(100)';
      }
    };
    websqlDataType = function(dataType, necessity) {
      switch (dataType) {
        case 'Serial':
          return 'INTEGER ' + necessity + ' AUTOINCREMENT';
        case 'Real':
          return 'REAL ' + necessity;
        case 'Integer':
        case 'ForeignKey':
        case 'ConceptType':
          return 'INTEGER ' + necessity;
        case 'Short Text':
          return 'VARCHAR(20) ' + necessity;
        case 'Long Text':
          return 'TEXT ' + necessity;
        case 'Boolean':
          return 'INTEGER NOT NULL DEFAULT 0';
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
      websql: {
        generate: function(sqlModel) {
          return generate(sqlModel, websqlDataType);
        },
        dataTypeValidate: dataTypeValidate
      },
      postgres: {
        generate: function(sqlModel) {
          return generate(sqlModel, postgresDataType);
        },
        dataTypeValidate: dataTypeValidate
      }
    };
  });

}).call(this);

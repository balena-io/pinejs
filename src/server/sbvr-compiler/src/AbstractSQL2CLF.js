(function() {

  define(['underscore'], function(_) {
    var getField, splitID;
    getField = function(table, fieldName) {
      var tableField, tableFields, _i, _len;
      tableFields = table.fields;
      for (_i = 0, _len = tableFields.length; _i < _len; _i++) {
        tableField = tableFields[_i];
        if (tableField[1] === fieldName) return tableField;
      }
      return false;
    };
    splitID = function(id) {
      var part, parts;
      parts = id.split('-');
      return (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = parts.length; _i < _len; _i++) {
          part = parts[_i];
          _results.push(part.replace(/_/g, ' '));
        }
        return _results;
      })();
    };
    return function(sqlModel) {
      var addMapping, idParts, resourceField, resourceName, resourceToSQLMappings, resources, sqlField, sqlFieldName, sqlTable, sqlTableName, table, tables, _i, _len, _ref;
      tables = sqlModel.tables;
      resources = {};
      resourceToSQLMappings = {};
      /**
      		*	resourceToSQLMappings =
      		*		[resourceName][resourceField] = [sqlTableName, sqlFieldName]
      */
      addMapping = function(resourceName, resourceField, sqlTableName, sqlFieldName) {
        return resourceToSQLMappings[resourceName][resourceField] = [sqlTableName, sqlFieldName];
      };
      for (resourceName in tables) {
        table = tables[resourceName];
        idParts = splitID(resourceName);
        resourceToSQLMappings[resourceName] = {};
        if (_.isString(table)) {
          sqlTable = tables[idParts[0]];
          sqlFieldName = sqlTable.idField;
          resourceField = sqlTableName = sqlTable.name;
          addMapping(resourceName, resourceField, sqlTableName, sqlFieldName);
          resources[resourceName] = {
            name: resourceName,
            fields: [['ForeignKey', resourceField, 'NOT NULL', sqlFieldName]],
            idField: resourceField,
            valueField: resourceField,
            actions: ['view', 'add', 'delete']
          };
          switch (table) {
            case 'Attribute':
            case 'ForeignKey':
              resourceField = sqlFieldName = tables[idParts[2]].name;
              sqlTableName = sqlTable.name;
              addMapping(resourceName, resourceField, sqlTableName, sqlFieldName);
              resources[resourceName].fields.push(getField(sqlTable, sqlFieldName));
              resources[resourceName].valueField = resourceField;
              break;
            case 'BooleanAttribute':
              break;
            default:
              throw 'Unrecognised table type';
          }
        } else {
          resources[resourceName] = {
            name: resourceName,
            fields: table.fields,
            idField: table.idField,
            valueField: table.valueField,
            actions: ['view', 'add', 'edit', 'delete']
          };
          _ref = table.fields;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            sqlField = _ref[_i];
            addMapping(resourceName, sqlField[1], table.name, sqlField[1]);
          }
        }
      }
      return {
        resources: resources,
        resourceToSQLMappings: resourceToSQLMappings
      };
    };
  });

}).call(this);

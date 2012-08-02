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
      parts = id.split(',');
      if (parts.length === 1) return parts;
      return (function() {
        var _i, _len, _ref, _results, _step;
        _ref = parts.slice(1);
        _results = [];
        for (_i = 0, _len = _ref.length, _step = 2; _i < _len; _i += _step) {
          part = _ref[_i];
          _results.push(part);
        }
        return _results;
      })();
    };
    return function(sqlModel) {
      var baseTable, clfTables, conversions, field, id, idParts, newID, part, table, tables, _i, _len, _ref;
      tables = sqlModel.tables;
      clfTables = {};
      conversions = {};
      for (id in tables) {
        table = tables[id];
        idParts = splitID(id);
        newID = ((function() {
          var _i, _len, _results;
          _results = [];
          for (_i = 0, _len = idParts.length; _i < _len; _i++) {
            part = idParts[_i];
            _results.push(part.replace(/\s/g, '_'));
          }
          return _results;
        })()).join('-');
        conversions[newID] = {};
        if (_.isString(table)) {
          baseTable = tables[idParts[0]];
          clfTables[newID] = {
            fields: [['ForeignKey', baseTable.name, 'NOT NULL', baseTable.idField]],
            idField: baseTable.name,
            valueField: baseTable.idField,
            actions: ['view', 'add', 'delete']
          };
          conversions[newID][baseTable.idField] = baseTable.name;
          switch (table) {
            case 'Attribute':
            case 'ForeignKey':
              clfTables[newID].fields.push(getField(baseTable, tables[idParts[2]].name));
              clfTables[newID].valueField = baseTable.valueField;
              conversions[newID][baseTable.valueField] = baseTable.valueField;
              break;
            case 'BooleanAttribute':
              break;
            default:
              throw 'Unrecognised table type';
          }
        } else {
          clfTables[newID] = {
            fields: table.fields,
            idField: table.idField,
            valueField: table.valueField,
            actions: ['view', 'add', 'edit', 'delete']
          };
          _ref = clfTables[newID].fields;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            field = _ref[_i];
            conversions[newID][field[1]] = field[1];
          }
        }
      }
      return {
        tables: clfTables,
        conversions: conversions
      };
    };
  });

}).call(this);

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
      var baseTable, clfTables, id, idParts, table, tables, valueField;
      tables = sqlModel.tables;
      clfTables = {};
      for (id in tables) {
        table = tables[id];
        idParts = splitID(id);
        if (_.isString(table)) {
          switch (table) {
            case 'Attribute':
            case 'ForeignKey':
              valueField = tables[idParts[2]].name;
              break;
            case 'BooleanAttribute':
              valueField = idParts[1];
              break;
            default:
              throw 'Unrecognised table type';
          }
          baseTable = tables[idParts[0]];
          clfTables[idParts.join(' ')] = {
            fields: [getField(baseTable, baseTable.idField), getField(baseTable, valueField)],
            idField: baseTable.idField,
            valueField: valueField
          };
        } else {
          clfTables[idParts.join(' ')] = {
            fields: table.fields,
            idField: table.idField,
            valueField: table.valueField
          };
        }
      }
      return clfTables;
    };
  });

}).call(this);

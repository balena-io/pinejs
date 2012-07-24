(function() {

  define(["database-layer/SQLBinds"], function(SQLBinds) {
    var exports;
    exports = {};
    if (typeof process !== "undefined" && process !== null) {
      exports.postgres = function(connectString) {
        var Client, result, tx, _db;
        Client = new requirejs('pg').Client;
        _db = new Client(connectString);
        _db.connect();
        result = function(rows) {
          var _ref;
          return {
            rows: {
              length: (rows != null ? rows.length : void 0) || 0,
              item: function(i) {
                return rows[i];
              }
            },
            insertId: ((_ref = rows[0]) != null ? _ref.id : void 0) || null
          };
        };
        tx = {
          executeSql: function(sql, _bindings, callback, errorCallback, addReturning) {
            var bindNo, bindings, thisTX;
            if (_bindings == null) _bindings = [];
            if (addReturning == null) addReturning = true;
            thisTX = this;
            bindings = _bindings.slice(0);
            sql = sql.replace(/GROUP BY NULL/g, '');
            sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
            if (addReturning && /^\s*INSERT\s+INTO/i.test(sql)) {
              sql = sql.replace(/;?$/, ' RETURNING id;');
              console.log(sql);
            }
            bindNo = 0;
            sql = SQLBinds.matchAll(sql, "parse", [
              function() {
                var bindString, i, initialBindNo, _i, _len, _ref;
                initialBindNo = bindNo;
                bindString = '$' + ++bindNo;
                if (Array.isArray(bindings[initialBindNo])) {
                  _ref = bindings[initialBindNo].slice(1);
                  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    i = _ref[_i];
                    bindString += ',' + '$' + ++bindNo;
                  }
                  Array.prototype.splice.apply(bindings, [initialBindNo, 1].concat(bindings[initialBindNo]));
                }
                return bindString;
              }
            ]);
            return _db.query({
              text: sql,
              values: bindings
            }, function(err, res) {
              if (err != null) {
                if (typeof errorCallback === "function") {
                  errorCallback(thisTX, err);
                }
                return console.log(sql, bindings, err);
              } else {
                return typeof callback === "function" ? callback(thisTX, result(res.rows)) : void 0;
              }
            });
          },
          begin: function() {
            return this.executeSql('BEGIN;');
          },
          end: function() {
            return this.executeSql('END;');
          },
          rollback: function() {
            return this.executeSql('ROLLBACK;');
          },
          tableList: function(callback, errorCallback, extraWhereClause) {
            if (extraWhereClause == null) extraWhereClause = '';
            if (extraWhereClause !== '') {
              extraWhereClause = ' WHERE ' + extraWhereClause;
            }
            return this.executeSql("SELECT * FROM (SELECT tablename as name FROM pg_tables WHERE schemaname = 'public' AND tablename != '_server_model_cache') t" + extraWhereClause + ";", [], callback, errorCallback);
          },
          dropTable: function(tableName, ifExists, callback, errorCallback) {
            if (ifExists == null) ifExists = true;
            return this.executeSql('DROP TABLE ' + (ifExists === true ? 'IF EXISTS ' : '') + '"' + tableName + '" CASCADE;', [], callback, errorCallback);
          }
        };
        return {
          transaction: function(callback) {
            return callback(tx);
          }
        };
      };
      exports.mysql = function(options) {
        var mysql, result, tx, _db;
        mysql = new requirejs('mysql');
        _db = mysql.createClient(options);
        _db.query("SET sql_mode='ANSI_QUOTES';");
        result = function(rows) {
          return {
            rows: {
              length: (rows != null ? rows.length : void 0) || 0,
              item: function(i) {
                return rows[i];
              }
            },
            insertId: rows.insertId || null
          };
        };
        tx = {
          executeSql: function(sql, bindings, callback, errorCallback, addReturning) {
            var thisTX;
            if (bindings == null) bindings = [];
            if (addReturning == null) addReturning = true;
            thisTX = this;
            sql = sql.replace(/GROUP BY NULL/g, '');
            sql = sql.replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT');
            sql = sql.replace(/DROP CONSTRAINT/g, 'DROP FOREIGN KEY');
            return _db.query(sql, bindings, function(err, res, fields) {
              if (err != null) {
                if (typeof errorCallback === "function") {
                  errorCallback(thisTX, err);
                }
                return console.log(sql, bindings, err);
              } else {
                return typeof callback === "function" ? callback(thisTX, result(res)) : void 0;
              }
            });
          },
          begin: function() {
            return this.executeSql('START TRANSACTION;');
          },
          end: function() {
            return this.executeSql('COMMIT;');
          },
          rollback: function() {
            return this.executeSql('ROLLBACK;');
          },
          tableList: function(callback, errorCallback, extraWhereClause) {
            if (extraWhereClause == null) extraWhereClause = '';
            if (extraWhereClause !== '') {
              extraWhereClause = ' WHERE ' + extraWhereClause;
            }
            return this.executeSql("SELECT name FROM (SELECT tablename as name FROM information_schema.tables WHERE table_schema = '" + _db.escape(options.database) + "' AND tablename != '_server_model_cache') t" + extraWhereClause + ";", [], callback, errorCallback);
          },
          dropTable: function(tableName, ifExists, callback, errorCallback) {
            if (ifExists == null) ifExists = true;
            return this.executeSql('DROP TABLE ' + (ifExists === true ? 'IF EXISTS ' : '') + '"' + tableName + '";', [], callback, errorCallback);
          }
        };
        return {
          transaction: function(callback) {
            return callback(tx);
          }
        };
      };
      exports.sqlite = function(filepath) {
        var result, sqlite3, tx, _db;
        sqlite3 = requirejs('sqlite3').verbose();
        _db = new sqlite3.Database(filepath);
        result = function(rows) {
          return {
            rows: {
              length: (rows != null ? rows.length : void 0) || 0,
              item: function(i) {
                return rows[i];
              }
            }
          };
        };
        tx = {
          executeSql: function(sql, bindings, callback, errorCallback) {
            var thisTX;
            thisTX = this;
            return _db.all(sql, bindings != null ? bindings : [], function(err, rows) {
              if (err != null) {
                if (typeof errorCallback === "function") {
                  errorCallback(thisTX, err);
                }
                return console.log(sql, err);
              } else {
                return typeof callback === "function" ? callback(thisTX, result(rows)) : void 0;
              }
            });
          },
          begin: function() {
            return this.executeSql('BEGIN;');
          },
          end: function() {
            return this.executeSql('END;');
          },
          rollback: function() {
            return this.executeSql('ROLLBACK;');
          },
          tableList: function(callback, errorCallback, extraWhereClause) {
            if (extraWhereClause == null) extraWhereClause = '';
            if (extraWhereClause !== '') {
              extraWhereClause = ' AND ' + extraWhereClause;
            }
            return this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('sqlite_sequence', '_server_model_cache')" + extraWhereClause + ";", [], callback, errorCallback);
          },
          dropTable: function(tableName, ifExists, callback, errorCallback) {
            if (ifExists == null) ifExists = true;
            return this.executeSql('DROP TABLE ' + (ifExists === true ? 'IF EXISTS ' : '') + '"' + tableName + '";', [], callback, errorCallback);
          }
        };
        return {
          transaction: function(callback) {
            return _db.serialize(function() {
              return callback(tx);
            });
          }
        };
      };
    } else {
      exports.websql = function(databaseName) {
        var tx, _db;
        _db = openDatabase(databaseName, "1.0", "rulemotion", 2 * 1024 * 1024);
        tx = function(_tx) {
          return {
            executeSql: function(sql, bindings, callback, errorCallback) {
              var thisTX;
              thisTX = this;
              try {
                return ___STACK_TRACE___.please;
              } catch (stackTrace) {
                null;
                if (callback != null) {
                  callback = (function(callback) {
                    return function(_tx, _results) {
                      return callback(thisTX, _results);
                    };
                  })(callback);
                }
                errorCallback = (function(errorCallback) {
                  return function(_tx, _err) {
                    console.log(sql, bindings, _err, stackTrace.stack);
                    return typeof errorCallback === "function" ? errorCallback(thisTX, _err) : void 0;
                  };
                })(errorCallback);
                return _tx.executeSql(sql, bindings, callback, errorCallback);
              }
            },
            begin: function() {},
            end: function() {},
            rollback: function() {
              return _tx.executeSql("DROP TABLE '__Fo0oFoo'");
            },
            tableList: function(callback, errorCallback, extraWhereClause) {
              if (extraWhereClause == null) extraWhereClause = '';
              if (extraWhereClause !== '') {
                extraWhereClause = ' AND ' + extraWhereClause;
              }
              return this.executeSql("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT IN ('__WebKitDatabaseInfoTable__', 'sqlite_sequence', '_server_model_cache')" + extraWhereClause + ";", [], callback, errorCallback);
            },
            dropTable: function(tableName, ifExists, callback, errorCallback) {
              if (ifExists == null) ifExists = true;
              return this.executeSql('DROP TABLE ' + (ifExists === true ? 'IF EXISTS ' : '') + '"' + tableName + '";', [], callback, errorCallback);
            }
          };
        };
        return {
          transaction: function(callback) {
            return _db.transaction(function(_tx) {
              return callback(tx(_tx));
            });
          }
        };
      };
    }
    return exports;
  });

}).call(this);

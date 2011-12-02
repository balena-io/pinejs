
  define(function(requirejs, exports, module) {
    if (typeof process !== "undefined" && process !== null) {
      exports.postgres = function(connectString) {
        var Client, result, tx, _db;
        requirejs(["libs/inflection", "../ometa-js/lib", "../ometa-js/ometa-base"]);
        requirejs(["mylibs/ometa-code/SQLBinds"]);
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
          executeSql: function(sql, bindings, callback, errorCallback, addReturning) {
            var bindNo, thisTX;
            if (bindings == null) bindings = [];
            if (addReturning == null) addReturning = true;
            thisTX = this;
            sql = sql.replace(/GROUP BY NULL/g, '');
            sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
            if (addReturning && /^\s*INSERT\s+INTO/i.test(sql)) {
              sql = sql.replace(/;?$/, ' RETURNING id;');
              console.log(sql);
            }
            bindNo = 1;
            sql = SQLBinds.matchAll(sql, "parse", [
              function() {
                return '$' + bindNo++;
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
      return exports.sqlite = function(filepath) {
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
      return exports.websql = function(databaseName) {
        var tx, _db;
        _db = openDatabase(databaseName, "1.0", "rulemotion", 2 * 1024 * 1024);
        tx = function(_tx) {
          return {
            executeSql: function(sql, bindings, callback, errorCallback) {
              var thisTX;
              thisTX = this;
              if (callback != null) {
                callback = (function(callback) {
                  return function(_tx, _results) {
                    return callback(thisTX, _results);
                  };
                })(callback);
              }
              errorCallback = (function(errorCallback) {
                return function(_tx, _err) {
                  console.log(sql, _err);
                  return typeof errorCallback === "function" ? errorCallback(thisTX, _err) : void 0;
                };
              })(errorCallback);
              return _tx.executeSql(sql, bindings, callback, errorCallback);
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
  });

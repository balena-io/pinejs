(function() {
  var dataGET, dataplusDELETE, dataplusGET, dataplusPOST, dataplusPUT, db, endLock, executeSasync, executeTasync, getFTree, getID, handlers, hasCR, http, isExecute, op, remoteServerRequest, requirejs, rootDELETE, serverModelCache, staticServer, updateRules, validateDB;
  var __hasProp = Object.prototype.hasOwnProperty;
  op = {
    eq: "=",
    ne: "!=",
    lk: "~"
  };
  if (typeof process !== "undefined" && process !== null) {
    requirejs = require('requirejs');
    requirejs.config({
      nodeRequire: require,
      baseUrl: 'js'
    });
    db = (function() {
      var Client, result, tx, _db;
      Client = new require('pg').Client;
      _db = new Client(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres");
      _db.connect();
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
          var bindNo, thisTX;
          if (bindings == null) {
            bindings = [];
          }
          thisTX = this;
          sql = sql.replace(/GROUP BY NULL/g, '');
          sql = sql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
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
              return console.log(sql, err);
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
          if (extraWhereClause == null) {
            extraWhereClause = '';
          }
          if (extraWhereClause !== '') {
            extraWhereClause = ' WHERE ' + extraWhereClause;
          }
          return this.executeSql("SELECT * FROM (SELECT tablename as name FROM pg_tables WHERE schemaname = 'public') t" + extraWhereClause + ";", [], callback, errorCallback);
        },
        dropTable: function(tableName, ifExists, callback, errorCallback) {
          if (ifExists == null) {
            ifExists = true;
          }
          return this.executeSql('DROP TABLE ' + (ifExists === true ? 'IF EXISTS ' : '') + '"' + tableName + '" CASCADE;', [], callback, errorCallback);
        }
      };
      return {
        transaction: function(callback) {
          return callback(tx);
        }
      };
    })();
  } else {
    requirejs = window.requirejs;
    db = (function() {
      var tx, _db;
      _db = openDatabase("rulemotion", "1.0", "rulemotion", 2 * 1024 * 1024);
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
            if (extraWhereClause == null) {
              extraWhereClause = '';
            }
            if (extraWhereClause !== '') {
              extraWhereClause = ' AND ' + extraWhereClause;
            }
            return this.executeSql("SELECT name FROM sqlite_master WHERE type='table' AND name != '__WebKitDatabaseInfoTable__' AND name != 'sqlite_sequence'" + extraWhereClause + ";", [], callback, errorCallback);
          },
          dropTable: function(tableName, ifExists, callback, errorCallback) {
            if (ifExists == null) {
              ifExists = true;
            }
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
    })();
  }
  requirejs(["libs/inflection", "../ometa-js/lib", "../ometa-js/ometa-base"]);
  requirejs(["mylibs/ometa-code/SBVRModels", "mylibs/ometa-code/SBVRParser", "mylibs/ometa-code/SBVR_PreProc", "mylibs/ometa-code/SBVR2SQL", "mylibs/ometa-code/ServerURIParser"]);
  if (typeof process !== "undefined" && process !== null) {
    requirejs(["mylibs/ometa-code/SQLBinds"]);
  }
  serverModelCache = (function() {
    var setValue, values;
    values = {
      serverOnAir: false,
      modelAreaDisabled: false,
      se: "",
      lastSE: "",
      lf: [],
      prepLF: [],
      sql: [],
      trans: []
    };
    db.transaction(function(tx) {
      tx.executeSql('CREATE TABLE ' + '"_server_model_cache" (' + '"key"	VARCHAR PRIMARY KEY,' + '"value"	VARCHAR );');
      return tx.executeSql('SELECT * FROM "_server_model_cache";', [], function(tx, result) {
        var i, row, _ref, _results;
        _results = [];
        for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
          row = result.rows.item(i);
          _results.push(values[row.key] = JSON.parse(row.value));
        }
        return _results;
      });
    });
    setValue = function(key, value) {
      values[key] = value;
      return db.transaction(function(tx) {
        value = JSON.stringify(value).replace(/\\'/g, "\\\\'").replace(new RegExp("'", 'g'), "\\'");
        return tx.executeSql('SELECT 1 as count FROM "_server_model_cache" WHERE key = ?;', [key], function(tx, result) {
          if (result.rows.length === 0) {
            return tx.executeSql('INSERT INTO "_server_model_cache" VALUES (?, ?);', [key, value]);
          } else {
            return tx.executeSql('UPDATE "_server_model_cache" SET value = ? WHERE key = ?;', [value, key]);
          }
        });
      });
    };
    return {
      isServerOnAir: function() {
        return values.serverOnAir;
      },
      setServerOnAir: function(bool) {
        return setValue('serverOnAir', bool);
      },
      isModelAreaDisabled: function() {
        return values.modelAreaDisabled;
      },
      setModelAreaDisabled: function(bool) {
        return setValue('modelAreaDisabled', bool);
      },
      getSE: function() {
        return values.se;
      },
      setSE: function(txtmod) {
        return setValue('se', txtmod);
      },
      getLastSE: function() {
        return values.lastSE;
      },
      setLastSE: function(txtmod) {
        return setValue('lastSE', txtmod);
      },
      getLF: function() {
        return values.lf;
      },
      setLF: function(lfmod) {
        return setValue('lf', lfmod);
      },
      getPrepLF: function() {
        return values.prepLF;
      },
      setPrepLF: function(prepmod) {
        return setValue('prepLF', prepmod);
      },
      getSQL: function() {
        return values.sql;
      },
      setSQL: function(sqlmod) {
        return setValue('sql', sqlmod);
      },
      getTrans: function() {
        return values.trans;
      },
      setTrans: function(trnmod) {
        return setValue('trans', trnmod);
      }
    };
  })();
  handlers = {
    onair: {
      GET: function(successCallback, failureCallback) {
        return successCallback(200, serverModelCache.isServerOnAir());
      }
    },
    model: {
      GET: [
        function() {
          return serverModelCache.isServerOnAir();
        }, function(successCallback, failureCallback) {
          return successCallback(200, serverModelCache.getLastSE());
        }
      ]
    },
    lfmodel: {
      GET: [
        function() {
          return serverModelCache.isServerOnAir();
        }, function(successCallback, failureCallback) {
          return successCallback(200, serverModelCache.getLF());
        }
      ]
    },
    prepmodel: {
      GET: [
        function() {
          return serverModelCache.isServerOnAir();
        }, function(successCallback, failureCallback) {
          return successCallback(200, serverModelCache.getPrepLF());
        }
      ]
    },
    sqlmodel: {
      GET: [
        function() {
          return serverModelCache.isServerOnAir();
        }, function(successCallback, failureCallback) {
          return successCallback(200, serverModelCache.getSQL());
        }
      ]
    },
    update: {
      POST: function(successCallback, failureCallback) {
        return failureCallback(404);
      }
    },
    ui: {
      GET: [
        [
          function(tree) {
            return tree[1][1] === "textarea" && tree[1][3][1][1][3] === "model_area";
          }, function(successCallback, failureCallback) {
            return successCallback(200, {
              value: serverModelCache.getSE()
            });
          }
        ], [
          function(tree) {
            return tree[1][1] === "textarea-is_disabled" && tree[1][4][1][1][3] === "model_area";
          }, function(successCallback, failureCallback) {
            return successCallback(200, {
              value: serverModelCache.isModelAreaDisabled()
            });
          }
        ]
      ],
      PUT: [
        [
          function(tree) {
            return tree[1][1] === "textarea" && tree[1][3][1][1][3] === "model_area";
          }, function(successCallback, failureCallback, body) {
            serverModelCache.setSE(JSON.parse(body).value);
            return successCallback(200);
          }
        ], [
          function(tree) {
            return tree[1][1] === "textarea-is_disabled" && tree[1][4][1][1][3] === "model_area";
          }, function(successCallback, failureCallback, body) {
            serverModelCache.setModelAreaDisabled(JSON.parse(body).value);
            return successCallback(200);
          }
        ]
      ]
    },
    execute: {
      POST: function(successCallback, failureCallback) {
        var lfmod, prepmod, se, sqlmod, tree, trnmod;
        se = serverModelCache.getSE();
        try {
          lfmod = SBVRParser.matchAll(se, "expr");
        } catch (e) {
          console.log('Error parsing model', e);
          failureCallback(404, 'Error parsing model');
          return null;
        }
        prepmod = SBVR_PreProc.match(lfmod, "optimizeTree");
        sqlmod = SBVR2SQL.match(prepmod, "trans");
        tree = SBVRParser.matchAll(modelT, "expr");
        tree = SBVR_PreProc.match(tree, "optimizeTree");
        trnmod = SBVR2SQL.match(tree, "trans");
        serverModelCache.setModelAreaDisabled(true);
        return db.transaction(function(tx) {
          tx.begin();
          return executeSasync(tx, sqlmod, (function(tx, sqlmod, failureCallback, result) {
            return executeTasync(tx, trnmod, (function(tx, trnmod, failureCallback, result) {
              serverModelCache.setServerOnAir(true);
              serverModelCache.setLastSE(se);
              serverModelCache.setLF(lfmod);
              serverModelCache.setPrepLF(prepmod);
              serverModelCache.setSQL(sqlmod);
              serverModelCache.setTrans(trnmod);
              return successCallback(200, result);
            }), failureCallback, result);
          }), (function(errors) {
            serverModelCache.setModelAreaDisabled(false);
            return failureCallback(404, errors);
          }));
        });
      }
    },
    cleardb: {
      DELETE: function(successCallback, failureCallback) {
        return db.transaction(function(tx) {
          return tx.tableList(function(tx, result) {
            var i, _ref;
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tx.dropTable(result.rows.item(i).name);
            }
            return successCallback(200);
          });
        });
      }
    },
    importdb: {
      POST: function(successCallback, failureCallback, body) {
        var imported, queries;
        queries = body.split(";");
        imported = 0;
        db.transaction(function(tx) {
          var query, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = queries.length; _i < _len; _i++) {
            query = queries[_i];
            if (query.trim().length > 0) {
              _results.push((function(query) {
                return tx.executeSql(query, [], (function(tx, result) {
                  return console.log("Import Success", imported++);
                }), function(tx, error) {
                  console.log(query);
                  return console.log(error);
                });
              })(query));
            }
          }
          return _results;
        });
        return successCallback(200);
      }
    },
    exportdb: {
      GET: function(successCallback, failureCallback) {
        return db.transaction(function(tx) {
          return tx.executeSql("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE '\\_\\_%' ESCAPE '\\' AND name NOT LIKE '%_buk';", [], (function(tx, result) {
            var exported, exportsProcessed, i, tbn, totalExports, _fn, _ref;
            totalExports = result.rows.length + 1;
            exportsProcessed = 0;
            exported = '';
            _fn = function(tbn) {
              return db.transaction(function(tx) {
                return tx.executeSql('SELECT * FROM "' + tbn + '";', [], (function(tx, result) {
                  var currRow, i, insQuery, notFirst, propName, valQuery, _ref2;
                  insQuery = "";
                  for (i = 0, _ref2 = result.rows.length; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
                    currRow = result.rows.item(i);
                    notFirst = false;
                    insQuery += 'INSERT INTO "' + tbn + '" (';
                    valQuery = '';
                    for (propName in currRow) {
                      if (!__hasProp.call(currRow, propName)) continue;
                      if (notFirst) {
                        insQuery += ",";
                        valQuery += ",";
                      } else {
                        notFirst = true;
                      }
                      insQuery += '"' + propName + '"';
                      valQuery += "'" + currRow[propName] + "'";
                    }
                    insQuery += ") values (" + valQuery + ");\n";
                  }
                  exported += insQuery;
                  exportsProcessed++;
                  if (exportsProcessed === totalExports) {
                    return successCallback(200, exported);
                  }
                }));
              });
            };
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tbn = result.rows.item(i).name;
              exported += 'DROP TABLE IF EXISTS "' + tbn + '";\n';
              exported += result.rows.item(i).sql + ";\n";
              _fn(tbn);
            }
            exportsProcessed++;
            if (exportsProcessed === totalExports) {
              return successCallback(200, exported);
            }
          }));
        });
      }
    },
    backupdb: {
      POST: function(successCallback, failureCallback) {
        db.transaction(function(tx) {
          return tx.tableList(function(tx, result) {
            var i, tbn, _ref, _results;
            _results = [];
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tbn = result.rows.item(i).name;
              tx.dropTable(tbn + '_buk', true);
              _results.push(tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn + '_buk";'));
            }
            return _results;
          }, null, "name NOT LIKE '%_buk'");
        });
        return successCallback(200);
      }
    },
    restoredb: {
      POST: function(successCallback, failureCallback) {
        db.transaction(function(tx) {
          return tx.tableList(function(tx, result) {
            var i, tbn, _ref, _results;
            _results = [];
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tbn = result.rows.item(i).name;
              tx.dropTable(tbn.slice(0, -4), true);
              _results.push(tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn.slice(0, -4) + '";'));
            }
            return _results;
          }, null, "name LIKE '%_buk'");
        });
        return successCallback(200);
      }
    }
  };
  remoteServerRequest = function(method, uri, headers, body, successCallback, failureCallback) {
    var execFilterHandle, execHandle, filterHandle, o, rootbranch, tree, _i, _len, _ref;
    if (typeof successCallback !== "function") {
      successCallback = function() {};
    }
    if (typeof failureCallback !== "function") {
      failureCallback = function() {};
    }
    tree = ServerURIParser.matchAll(uri, "uri");
    if ((headers != null) && headers["Content-Type"] === "application/xml") {
      null;
    }
    execHandle = function(handle) {
      return handle(successCallback, failureCallback, body);
    };
    execFilterHandle = function(filterHandle) {
      if (filterHandle[0](tree)) {
        execHandle(filterHandle[1]);
        return true;
      }
      return false;
    };
    rootbranch = tree[0].toLowerCase();
    if (handlers[rootbranch] != null) {
      if (handlers[rootbranch][method] != null) {
        if (typeof handlers[rootbranch][method] === 'function') {
          execHandle(handlers[rootbranch][method]);
        } else {
          if (handlers[rootbranch][method].constructor.name === 'Array') {
            if (handlers[rootbranch][method][0].constructor.name === 'Array') {
              _ref = handlers[rootbranch][method];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                filterHandle = _ref[_i];
                if (execFilterHandle(filterHandle)) {
                  return;
                }
              }
            } else if (!execFilterHandle(handlers[rootbranch][method])) {
              failureCallback(404);
            }
          } else {
            throw new Exception('Incorrect handler setup: ', rootbranch, method);
          }
        }
      } else {
        failureCallback(404);
      }
      return;
    }
    switch (rootbranch) {
      case "data":
        if (serverModelCache.isServerOnAir()) {
          if (tree[1] === void 0) {
            switch (method) {
              case "GET":
                return dataGET(tree, headers, body, successCallback, failureCallback);
              default:
                return failureCallback(404);
            }
          } else if (tree[1][1] === "transaction" && method === "GET") {
            o = {
              id: tree[1][3][1][1][3],
              tcURI: "/transaction",
              lcURI: "/data/lock",
              tlcURI: "/data/lock-belongs_to-transaction",
              rcURI: "/data/resource",
              lrcURI: "/data/resource-is_under-lock",
              slcURI: "/data/lock-is_shared",
              xlcURI: "/data/lock-is_exclusive",
              ctURI: "/data/transaction*filt:transaction.id=" + tree[1][3][1][1][3] + "/execute"
            };
            return successCallback(200, o);
          } else {
            switch (method) {
              case "GET":
                return dataplusGET(tree, headers, body, successCallback, failureCallback);
              case "POST":
                return dataplusPOST(tree, headers, body, successCallback, failureCallback);
              case "PUT":
                return dataplusPUT(tree, headers, body, successCallback, failureCallback);
              case "DELETE":
                return dataplusDELETE(tree, headers, body, successCallback, failureCallback);
              default:
                return failureCallback(404);
            }
          }
        }
        break;
      default:
        if (method === "DELETE") {
          return rootDELETE(tree, headers, body, successCallback, failureCallback);
        } else {
          return failureCallback(404);
        }
    }
  };
  dataplusDELETE = function(tree, headers, body, successCallback, failureCallback) {
    var id;
    id = getID(tree);
    if (id !== 0) {
      if (tree[1][1] === "lock" && hasCR(tree)) {
        return db.transaction(function(tx) {
          tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]);
          return tx.executeSql('INSERT INTO "conditional_representation" ("lock_id","field_name","field_type","field_value")' + "VALUES (?,'__DELETE','','')", [id]);
        });
      } else {
        return db.transaction((function(tx) {
          return tx.executeSql('SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], function(tx, result) {
            if (result.rows.item(0).result === 1) {
              tx.begin();
              return tx.executeSql('DELETE FROM "' + tree[1][1] + '" WHERE id = ?;', [id], function(tx, result) {
                return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                  tx.end();
                  return successCallback(200, result);
                }), failureCallback);
              });
            } else {
              return failureCallback(404, ["The resource is locked and cannot be deleted"]);
            }
          });
        }), function(err) {});
      }
    }
  };
  dataplusPUT = function(tree, headers, body, successCallback, failureCallback) {
    var bd, id, k, pair, ps, _ref;
    id = getID(tree);
    if (tree[1][1] === "lock" && hasCR(tree)) {
      bd = JSON.parse(body);
      ps = [];
      for (pair in bd) {
        if (!__hasProp.call(bd, pair)) continue;
        _ref = bd[pair];
        for (k in _ref) {
          if (!__hasProp.call(_ref, k)) continue;
          ps.push([id, k, typeof bd[pair][k], bd[pair][k]]);
        }
      }
      return db.transaction(function(tx) {
        var item, sql, _results;
        tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]);
        _results = [];
        for (item in ps) {
          if (!__hasProp.call(ps, item)) continue;
          sql = "INSERT INTO 'conditional_representation'('lock_id'," + "'field_name','field_type','field_value')" + "VALUES (?, ?, ?, ?)";
          _results.push(tx.executeSql(sql, [ps[item][0], ps[item][1], ps[item][2], ps[item][3]], function(tx, result) {}));
        }
        return _results;
      });
    } else {
      return db.transaction((function(tx) {
        return tx.executeSql('SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], function(tx, result) {
          var k, pair, _ref2;
          if (result.rows.item(0).result === 1) {
            if (id !== "") {
              bd = JSON.parse(body);
              ps = [];
              for (pair in bd) {
                if (!__hasProp.call(bd, pair)) continue;
                _ref2 = bd[pair];
                for (k in _ref2) {
                  if (!__hasProp.call(_ref2, k)) continue;
                  ps.push(k + "=" + JSON.stringify(bd[pair][k]));
                }
              }
              tx.begin();
              return tx.executeSql('UPDATE "' + tree[1][1] + '" SET ' + ps.join(",") + " WHERE id = ?;", [id], function(tx) {
                return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                  tx.end();
                  return successCallback(200, result);
                }), failureCallback);
              });
            }
          } else {
            return failureCallback(404, ["The resource is locked and cannot be edited"]);
          }
        });
      }), function(err) {});
    }
  };
  dataplusPOST = function(tree, headers, body, successCallback, failureCallback) {
    var bd, binds, field, fields, i, id, pair, value, values;
    if (tree[1][1] === "transaction" && isExecute(tree)) {
      id = getID(tree);
      return db.transaction((function(tx) {
        return tx.executeSql('SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id" = ?;', [id], function(tx, locks) {
          return endLock(tx, locks, 0, id, successCallback, failureCallback);
        });
      }), function(error) {
        return db.transaction(function(tx) {
          return tx.executeSql('SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id" = ?;', [id], function(tx, locks) {
            var i, lock_id, _ref;
            for (i = 0, _ref = locks.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              lock_id = locks.rows.item(i).lock_id;
              tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id]);
              tx.executeSql('DELETE FROM "lock-is_exclusive" WHERE "lock_id" = ?;', [lock_id]);
              tx.executeSql('DELETE FROM "lock-is_shared" WHERE "lock_id" = ?;', [lock_id]);
              tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [lock_id]);
              tx.executeSql('DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id" = ?;', [lock_id]);
              tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lock_id]);
            }
            return tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [lock_id]);
          });
        });
      });
    } else {
      bd = JSON.parse(body);
      fields = [];
      values = [];
      binds = [];
      for (i in bd) {
        if (!__hasProp.call(bd, i)) continue;
        pair = bd[i];
        for (field in pair) {
          if (!__hasProp.call(pair, field)) continue;
          value = pair[field];
          fields.push(field);
          values.push(value);
          binds.push('?');
        }
      }
      return db.transaction(function(tx) {
        var sql;
        tx.begin();
        sql = 'INSERT INTO "' + tree[1][1] + '" ("' + fields.join('","') + '") VALUES (' + binds.join(",") + ");";
        return tx.executeSql(sql, values, function(tx, sqlResult) {
          return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, headers, result) {
            return successCallback(201, result, {
              location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + sqlResult.insertId
            });
          }), failureCallback);
        });
      });
    }
  };
  rootDELETE = function(tree, headers, body, successCallback, failureCallback) {
    db.transaction((function(sqlmod) {
      return function(tx) {
        var row, _i, _len, _ref, _ref2, _results;
        _ref = sqlmod.slice(1);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          if ((_ref2 = row[0]) === "fcTp" || _ref2 === "term") {
            _results.push(tx.executeSql(row[5]));
          }
        }
        return _results;
      };
    })(serverModelCache.getSQL()));
    db.transaction((function(trnmod) {
      return function(tx) {
        var row, _i, _len, _ref, _ref2, _results;
        _ref = trnmod.slice(1);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          if ((_ref2 = row[0]) === "fcTp" || _ref2 === "term") {
            _results.push(tx.executeSql(row[5]));
          }
        }
        return _results;
      };
    })(serverModelCache.getTrans()));
    serverModelCache.setSE("");
    serverModelCache.setModelAreaDisabled(false);
    serverModelCache.setLastSE("");
    serverModelCache.setPrepLF([]);
    serverModelCache.setLF([]);
    serverModelCache.setSQL([]);
    serverModelCache.setTrans([]);
    serverModelCache.setServerOnAir(false);
    return successCallback(200);
  };
  dataGET = function(tree, headers, body, successCallback, failureCallback) {
    var result, row, sqlmod, _i, _len, _ref;
    result = {
      terms: [],
      fcTps: []
    };
    sqlmod = serverModelCache.getSQL();
    _ref = sqlmod.slice(1);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      row = _ref[_i];
      if (row[0] === "term") {
        result.terms.push({
          id: row[1],
          name: row[2]
        });
      } else if (row[0] === "fcTp") {
        result.fcTps.push({
          id: row[1],
          name: row[2]
        });
      }
    }
    return successCallback(200, result);
  };
  dataplusGET = function(tree, headers, body, successCallback, failureCallback) {
    var filts, fl, ft, ftree, jn, obj, row, row2, sql, tb, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
    ftree = getFTree(tree);
    sql = "";
    if (tree[1][0] === "term") {
      sql = "SELECT * FROM " + tree[1][1];
      if (ftree.length !== 1) {
        sql += " WHERE ";
      }
    } else if (tree[1][0] === "fcTp") {
      ft = tree[1][1];
      fl = ['"' + ft + '".id AS id'];
      jn = [];
      tb = ['"' + ft + '"'];
      _ref = tree[1][2].slice(1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        row = _ref[_i];
        fl.push('"' + row + '" .id AS "' + row + '_id"');
        fl.push('"' + row + '".name AS "' + row + '_name"');
        tb.push('"' + row + '"');
        jn.push('"' + row + '".id = "' + ft + '"."' + row + '_id"');
      }
      sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ");
      if (ftree.length !== 1) {
        sql += " AND ";
      }
    }
    if (ftree.length !== 1) {
      filts = [];
      _ref2 = ftree.slice(1);
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        row = _ref2[_j];
        if (row[0] === "filt") {
          _ref3 = row.slice(1);
          for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
            row2 = _ref3[_k];
            obj = "";
            if (row2[1][0] != null) {
              obj = '"' + row2[1] + '".';
            }
            filts.push(obj + '"' + row2[2] + '"' + op[row2[0]] + row2[3]);
          }
        } else if (row[0] === "sort") {
          null;
        }
      }
      sql += filts.join(" AND ");
    }
    if (sql !== "") {
      return db.transaction(function(tx) {
        return tx.executeSql(sql + ";", [], function(tx, result) {
          var data, i;
          data = {
            instances: (function() {
              var _ref4, _results;
              _results = [];
              for (i = 0, _ref4 = result.rows.length; 0 <= _ref4 ? i < _ref4 : i > _ref4; 0 <= _ref4 ? i++ : i--) {
                _results.push(result.rows.item(i));
              }
              return _results;
            })()
          };
          return successCallback(200, data);
        });
      });
    }
  };
  endLock = function(tx, locks, i, trans_id, successCallback, failureCallback) {
    var lock_id;
    lock_id = locks.rows.item(i).lock_id;
    tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id], function(tx, crs) {
      return tx.executeSql('SELECT * FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [crs.rows.item(0).lock_id], function(tx, locked) {
        var item, j, sql, _ref;
        if (crs.rows.item(0).field_name === "__DELETE") {
          tx.executeSql('DELETE FROM "' + locked.rows.item(0).resource_type + '" WHERE "id" = ?;', [locked.rows.item(0).resource_id], function(tx, result) {
            if (i < locks.rows.length - 1) {
              return endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback);
            } else {
              tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [trans_id]);
              return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                return successCallback(200, result);
              }), failureCallback);
            }
          });
        } else {
          sql = 'UPDATE "' + locked.rows.item(0).resource_type + '" SET ';
          for (j = 0, _ref = crs.rows.length; 0 <= _ref ? j < _ref : j > _ref; 0 <= _ref ? j++ : j--) {
            item = crs.rows.item(j);
            sql += '"' + item.field_name + '"=';
            if (item.field_type === "string") {
              sql += '"' + item.field_value + '"';
            } else {
              sql += item.field_value;
            }
            if (j < crs.rows.length - 1) {
              sql += ", ";
            }
          }
          sql += ' WHERE "id"=' + locked.rows.item(0).resource_id + ';';
          tx.executeSql(sql, [], function(tx, result) {
            if (i < locks.rows.length - 1) {
              return endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback);
            } else {
              tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [trans_id]);
              return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                return successCallback(200, result);
              }), failureCallback);
            }
          });
        }
        tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [crs.rows.item(0).lock_id]);
        return tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [crs.rows.item(0).lock_id]);
      });
    });
    tx.executeSql('DELETE FROM "lock-is_shared" WHERE "lock_id" = ?;', [lock_id]);
    tx.executeSql('DELETE FROM "lock-is_exclusive" WHERE "lock_id" = ?;', [lock_id]);
    tx.executeSql('DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id" = ?;', [lock_id]);
    return tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lock_id]);
  };
  validateDB = function(tx, sqlmod, successCallback, failureCallback) {
    var errors, row, totalExecuted, totalQueries, _i, _len;
    errors = [];
    totalQueries = 0;
    totalExecuted = 0;
    for (_i = 0, _len = sqlmod.length; _i < _len; _i++) {
      row = sqlmod[_i];
      if (row[0] === "rule") {
        totalQueries++;
        tx.executeSql(row[4], [], (function(row) {
          return function(tx, result) {
            var _ref;
            totalExecuted++;
            if ((_ref = result.rows.item(0).result) === false || _ref === 0) {
              errors.push(row[2]);
            }
            if (totalQueries === totalExecuted) {
              if (errors.length > 0) {
                tx.rollback();
                return failureCallback(404, errors);
              } else {
                tx.end();
                return successCallback(tx, sqlmod, failureCallback, result);
              }
            }
          };
        })(row));
      }
    }
    if (totalQueries === 0) {
      return successCallback(tx, sqlmod, failureCallback, "");
    }
  };
  executeSasync = function(tx, sqlmod, successCallback, failureCallback, result) {
    var row, _i, _len, _ref;
    for (_i = 0, _len = sqlmod.length; _i < _len; _i++) {
      row = sqlmod[_i];
      if ((_ref = row[0]) === "fcTp" || _ref === "term") {
        tx.executeSql(row[4]);
      }
    }
    return validateDB(tx, sqlmod, successCallback, failureCallback);
  };
  executeTasync = function(tx, trnmod, successCallback, failureCallback, result) {
    return executeSasync(tx, trnmod, (function(tx, trnmod, failureCallback, result) {
      tx.executeSql('ALTER TABLE "resource-is_under-lock" ADD COLUMN resource_type TEXT');
      tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN field_name TEXT');
      tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN field_value TEXT');
      tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN field_type TEXT');
      tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN lock_id TEXT');
      return successCallback(tx, trnmod, failureCallback, result);
    }), (function(errors) {
      serverModelCache.setModelAreaDisabled(false);
      return failureCallback(404, errors);
    }), result);
  };
  updateRules = function(sqlmod) {
    var query, row, _i, _j, _len, _len2, _ref, _results;
    for (_i = 0, _len = sqlmod.length; _i < _len; _i++) {
      row = sqlmod[_i];
      if ((_ref = row[0]) === "fcTp" || _ref === "term") {
        tx.executeSql(row[4]);
      }
    }
    _results = [];
    for (_j = 0, _len2 = sqlmod.length; _j < _len2; _j++) {
      row = sqlmod[_j];
      if (row[0] === "rule") {
        query = row[4];
        l[++m] = row[2];
        _results.push(tx.executeSql(query, [], function(tx, result) {
          if (result.rows.item(0)["result"] === 0) {
            return alert("Error: " + l[++k]);
          }
        }));
      }
    }
    return _results;
  };
  getFTree = function(tree) {
    if (tree[1][0] === "term") {
      return tree[1][3];
    } else if (tree[1][0] === "fcTp") {
      return tree[1][4];
    }
    return [];
  };
  getID = function(tree) {
    var f, ftree, id, _i, _len, _ref;
    if (tree[1][0] === "term") {
      id = tree[1][2];
    } else if (tree[1][0] === "fcTp") {
      id = tree[1][3];
    }
    if (id === "") {
      id = 0;
    }
    if (id === 0) {
      ftree = getFTree(tree);
      _ref = ftree.slice(1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        if (f[0] === "filt" && f[1][0] === "eq" && f[1][2] === "id") {
          return f[1][3];
        }
      }
    }
    return id;
  };
  hasCR = function(tree) {
    var f, _i, _len, _ref;
    _ref = getFTree(tree);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      if (f[0] === "cr") {
        return true;
      }
    }
    return false;
  };
  isExecute = function(tree) {
    var f, _i, _len, _ref;
    _ref = getFTree(tree);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      f = _ref[_i];
      if (f[0] === "execute") {
        return true;
      }
    }
    return false;
  };
  if (typeof process !== "undefined" && process !== null) {
    staticServer = new (require('node-static').Server)('./');
    http = require('http');
    http.createServer(function(request, response) {
      var body;
      console.log("Request received");
      body = '';
      request.on('data', function(chunk) {
        return body += chunk;
      });
      return request.on('end', function() {
        var nodePath;
        console.log('End', request.method, request.url);
        nodePath = '/node';
        if (nodePath === request.url.slice(0, nodePath.length)) {
          console.log('Node');
          return remoteServerRequest(request.method, request.url.slice(nodePath.length), request.headers, body, function(statusCode, result, headers) {
            if (result == null) {
              result = "";
            }
            console.log('Success', result);
            response.writeHead(statusCode, headers);
            return response.end(JSON.stringify(result));
          }, function(statusCode, errors, headers) {
            console.log('Error', errors, new Error().stack);
            response.writeHead(statusCode, headers);
            return response.end(JSON.stringify(errors));
          });
        } else {
          console.log('Static');
          return staticServer.serve(request, response);
        }
      });
    }).listen(process.env.PORT || 1337, function() {
      return console.log('Server started');
    });
  }
  if (typeof window !== "undefined" && window !== null) {
    window.remoteServerRequest = remoteServerRequest;
  }
}).call(this);

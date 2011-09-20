(function() {
  var dataGET, dataplusDELETE, dataplusGET, dataplusPOST, dataplusPUT, db, endLock, executePOST, executeSasync, executeTasync, getFTree, getID, hasCR, http, isExecute, op, remoteServerRequest, requirejs, rootDELETE, serverModelCache, updateRules, validateDB;
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
      baseUrl: '/home/page/sws/js'
    });
    db = (function() {
      var realDB, result, sqlite3, tx;
      sqlite3 = require('sqlite3').verbose();
      realDB = new sqlite3.Database('/tmp/mydb.db');
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
        executeSql: function(sql, bindings, callback) {
          return realDB.all(sql, bindings, function(err, rows) {
            return callback(tx, result(rows));
          });
        }
      };
      return {
        transaction: function(callback) {
          return realDB.serialize(function() {
            return callback(tx);
          });
        }
      };
    })();
  } else {
    requirejs = window.requirejs;
    db = openDatabase("mydb", "1.0", "my first database", 2 * 1024 * 1024);
  }
  requirejs(["../ometa-js/lib", "../ometa-js/ometa-base"]);
  requirejs(["mylibs/ometa-code/SBVRParser", "mylibs/ometa-code/SBVR_PreProc", "mylibs/ometa-code/SBVR2SQL", "mylibs/ometa-code/ServerURIParser"]);
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
      var sql;
      sql = 'CREATE TABLE IF NOT EXISTS "_server_model_cache" (' + '"key"	VARCHAR PRIMARY KEY,' + '"value"	VARCHAR );';
      tx.executeSql(sql, [], function(tx, result) {});
      sql = 'SELECT * FROM "_server_model_cache";';
      return tx.executeSql(sql, [], function(tx, result) {
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
        var sql;
        sql = 'INSERT OR REPLACE INTO "_server_model_cache" values' + "('" + key + "','" + JSON.stringify(value).replace(/\\'/g, "\\\\'").replace(new RegExp("'", 'g'), "\\'") + "');";
        return tx.executeSql(sql, [], function(tx, result) {});
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
  remoteServerRequest = function(method, uri, headers, body, successCallback, failureCallback) {
    var o, rootbranch, tree;
    tree = ServerURIParser.matchAll(uri, "uri");
    if ((headers != null) && headers["Content-Type"] === "application/xml") {
      null;
    }
    rootbranch = tree[0].toLowerCase();
    switch (rootbranch) {
      case "onair":
        if (method === "GET") {
          successCallback(200, JSON.stringify(serverModelCache.isServerOnAir()));
        }
        break;
      case "model":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            successCallback(200, serverModelCache.getLastSE());
          } else {
            if (typeof failureCallback === "function") {
              failureCallback(404);
            }
          }
        }
        break;
      case "lfmodel":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            successCallback(200, JSON.stringify(serverModelCache.getLF()));
          } else {
            if (typeof failureCallback === "function") {
              failureCallback(404);
            }
          }
        }
        break;
      case "prepmodel":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            successCallback(200, JSON.stringify(serverModelCache.getPrepLF()));
          } else {
            if (typeof failureCallback === "function") {
              failureCallback(404);
            }
          }
        }
        break;
      case "sqlmodel":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            successCallback(200, JSON.stringify(serverModelCache.getSQL()));
          } else {
            if (typeof failureCallback === "function") {
              failureCallback(404);
            }
          }
        }
        break;
      case "ui":
        if (tree[1][1] === "textarea" && tree[1][3][1][1][3] === "model_area") {
          switch (method) {
            case "PUT":
              serverModelCache.setSE(JSON.parse(body).value);
              successCallback(200);
              break;
            case "GET":
              successCallback(200, JSON.stringify({
                value: serverModelCache.getSE()
              }));
          }
        } else if (tree[1][1] === "textarea-is_disabled" && tree[1][4][1][1][3] === "model_area") {
          switch (method) {
            case "PUT":
              serverModelCache.setModelAreaDisabled(JSON.parse(body).value);
              successCallback(200);
              break;
            case "GET":
              successCallback(200, JSON.stringify({
                value: serverModelCache.isModelAreaDisabled()
              }));
          }
        }
        break;
      case "execute":
        if (method === "POST") {
          executePOST(tree, headers, body, successCallback, failureCallback);
        }
        break;
      case "update":
        if (method === "POST") {
          null;
        }
        break;
      case "data":
        if (serverModelCache.isServerOnAir()) {
          if (tree[1] === void 0) {
            switch (method) {
              case "GET":
                dataGET(tree, headers, body, successCallback, failureCallback);
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
            successCallback(200, JSON.stringify(o));
          } else {
            switch (method) {
              case "GET":
                console.log("body:[" + body + "]");
                dataplusGET(tree, headers, body, successCallback, failureCallback);
                break;
              case "POST":
                dataplusPOST(tree, headers, body, successCallback, failureCallback);
                break;
              case "PUT":
                dataplusPUT(tree, headers, body, successCallback, failureCallback);
                break;
              case "DELETE":
                dataplusDELETE(tree, headers, body, successCallback, failureCallback);
            }
          }
        } else {
          if (typeof failureCallback === "function") {
            failureCallback(404);
          }
        }
        break;
      default:
        if (method === "DELETE") {
          rootDELETE(tree, headers, body, successCallback, failureCallback);
        }
    }
    return typeof failureCallback === "function" ? failureCallback(404) : void 0;
  };
  dataplusDELETE = function(tree, headers, body, successCallback, failureCallback) {
    var id;
    id = getID(tree);
    if (id !== 0) {
      if (tree[1][1] === "lock" && hasCR(tree)) {
        return db.transaction(function(tx) {
          var sql;
          sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id;
          tx.executeSql(sql, [], function(tx, result) {});
          sql = "INSERT INTO 'conditional_representation'('lock_id','field_name','field_type','field_value')" + "VALUES ('" + id + "','__DELETE','','')";
          return tx.executeSql(sql, [], function(tx, result) {});
        });
      } else {
        return db.transaction((function(tx) {
          var sql;
          sql = "SELECT NOT EXISTS(SELECT * FROM 'resource-is_under-lock' AS r " + "WHERE r.'resource_type'=='" + tree[1][1] + "' " + "AND r.'resource_id'==" + id + ") AS result;";
          return tx.executeSql(sql, [], function(tx, result) {
            if (result.rows.item(0).result === 1) {
              sql = 'DELETE FROM "' + tree[1][1] + '" WHERE id=' + id + ";";
              return tx.executeSql(sql, [], function(tx, result) {
                return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                  return successCallback(200, result);
                }), failureCallback);
              });
            } else {
              return failureCallback(200, ["The resource is locked and cannot be deleted"]);
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
        sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + id;
        tx.executeSql(sql, [], function(tx, result) {});
        _results = [];
        for (item in ps) {
          if (!__hasProp.call(ps, item)) continue;
          sql = "INSERT INTO 'conditional_representation'('lock_id'," + "'field_name','field_type','field_value')" + "VALUES ('" + ps[item][0] + "','" + ps[item][1] + "','" + ps[item][2] + "','" + ps[item][3] + "')";
          _results.push(tx.executeSql(sql, [], function(tx, result) {}));
        }
        return _results;
      });
    } else {
      return db.transaction((function(tx) {
        var sql;
        sql = "SELECT NOT EXISTS(SELECT * FROM 'resource-is_under-lock' AS r WHERE r.'resource_type'=='" + tree[1][1] + "' AND r.'resource_id'==" + id + ") AS result;";
        return tx.executeSql(sql, [], function(tx, result) {
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
              sql = 'UPDATE "' + tree[1][1] + '" SET ' + ps.join(",") + " WHERE id=" + id + ";";
              return tx.executeSql(sql, [], function(tx) {
                return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                  return successCallback(200, result);
                }), failureCallback);
              });
            }
          } else {
            return failureCallback(200, ["The resource is locked and cannot be edited"]);
          }
        });
      }), function(err) {});
    }
  };
  dataplusPOST = function(tree, headers, body, successCallback, failureCallback) {
    var bd, fds, id, k, pair, sql, vls, _ref;
    if (tree[1][1] === "transaction" && isExecute(tree)) {
      id = getID(tree);
      return db.transaction((function(tx) {
        var sql;
        sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";";
        return tx.executeSql(sql, [], function(tx, locks) {
          return endLock(tx, locks, 0, id, successCallback, failureCallback);
        });
      }), function(error) {
        return db.transaction(function(tx) {
          var sql;
          sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";";
          return tx.executeSql(sql, [], function(tx, locks) {
            var i, lock_id, _ref;
            for (i = 0, _ref = locks.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              lock_id = locks.rows.item(i).lock_id;
              sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + lock_id + ";";
              console.log(sql);
              tx.executeSql(sql, [], function(tx, result) {});
              sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=' + lock_id + ";";
              console.log(sql);
              tx.executeSql(sql, [], function(tx, result) {});
              sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=' + lock_id + ";";
              console.log(sql);
              tx.executeSql(sql, [], function(tx, result) {});
              sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=' + lock_id + ";";
              console.log(sql);
              tx.executeSql(sql, [], function(tx, result) {});
              sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=' + lock_id + ";";
              console.log(sql);
              tx.executeSql(sql, [], function(tx, result) {});
              sql = 'DELETE FROM "lock" WHERE "id"=' + lock_id + ";";
              console.log(sql);
              tx.executeSql(sql, [], function(tx, result) {});
            }
            sql = 'DELETE FROM "transaction" WHERE "id"=' + id + ";";
            console.log(sql);
            return tx.executeSql(sql, [], function(tx, result) {});
          });
        });
      });
    } else {
      bd = JSON.parse(body);
      fds = [];
      vls = [];
      for (pair in bd) {
        if (!__hasProp.call(bd, pair)) continue;
        _ref = bd[pair];
        for (k in _ref) {
          if (!__hasProp.call(_ref, k)) continue;
          fds.push(k);
          vls.push(JSON.stringify(bd[pair][k]));
        }
      }
      sql = 'INSERT INTO "' + tree[1][1] + '"("' + fds.join('","') + '") VALUES (' + vls.join(",") + ");";
      return db.transaction(function(tx) {
        return tx.executeSql(sql, [], function(tx, sqlResult) {
          return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, headers, result) {
            return successCallback(201, result, {
              location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + sqlResult.insertId
            });
          }), failureCallback);
        });
      });
    }
  };
  executePOST = function(tree, headers, body, successCallback, failureCallback) {
    var lfmod, prepmod, se, sqlmod, trnmod;
    se = serverModelCache.getSE();
    lfmod = SBVRParser.matchAll(se, "expr");
    prepmod = SBVR_PreProc.match(lfmod, "optimizeTree");
    sqlmod = SBVR2SQL.match(prepmod, "trans");
    tree = SBVRParser.matchAll(modelT, "expr");
    tree = SBVR_PreProc.match(tree, "optimizeTree");
    trnmod = SBVR2SQL.match(tree, "trans");
    serverModelCache.setModelAreaDisabled(true);
    return db.transaction(function(tx) {
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
        return failureCallback(200, errors);
      }));
    });
  };
  rootDELETE = function(tree, headers, body, successCallback, failureCallback) {
    db.transaction((function(sqlmod) {
      return function(tx) {
        var row, _i, _len, _ref, _ref2, _results;
        _ref = sqlmod.slice(1);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          _results.push((_ref2 = row[0]) === "fcTp" || _ref2 === "term" ? tx.executeSql(row[5]) : void 0);
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
          _results.push((_ref2 = row[0]) === "fcTp" || _ref2 === "term" ? tx.executeSql(row[5]) : void 0);
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
    return successCallback(200, JSON.stringify(result));
  };
  dataplusGET = function(tree, headers, body, successCallback, failureCallback) {
    var ftree;
    ftree = getFTree(tree);
    return db.transaction(function(tx) {
      var filts, fl, ft, jn, obj, row, row2, sql, tb, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
      sql = "";
      if (tree[1][0] === "term") {
        sql = "SELECT " + "*" + " FROM " + tree[1][1];
        if (ftree.length !== 1) {
          sql += " WHERE ";
        }
      } else if (tree[1][0] === "fcTp") {
        ft = tree[1][1];
        fl = ["'" + ft + "'.id AS id"];
        jn = [];
        tb = ["'" + ft + "'"];
        _ref = tree[1][2].slice(1);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          row = _ref[_i];
          fl.push("'" + row + "'" + ".'id' AS '" + row + "_id'");
          fl.push("'" + row + "'" + ".'name' AS '" + row + "_name'");
          tb.push("'" + row + "'");
          jn.push("'" + row + "'" + ".'id' = " + "'" + ft + "'" + "." + "'" + row + "_id" + "'");
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
                obj = "'" + row2[1] + "'" + ".";
              }
              filts.push(obj + "'" + row2[2] + "'" + op[row2[0]] + row2[3]);
            }
          } else if (row[0] === "sort") {
            null;
          }
        }
        sql += filts.join(" AND ");
      }
      if (sql !== "") {
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
          return successCallback(200, JSON.stringify(data));
        });
      }
    });
  };
  endLock = function(tx, locks, i, trans_id, successCallback, failureCallback) {
    var lock_id, sql;
    lock_id = locks.rows.item(i).lock_id;
    sql = 'SELECT * FROM "conditional_representation" WHERE "lock_id"=' + lock_id + ';';
    tx.executeSql(sql, [], function(tx, crs) {
      sql = 'SELECT * FROM "resource-is_under-lock" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';';
      return tx.executeSql(sql, [], function(tx, locked) {
        var item, j, _ref;
        if (crs.rows.item(0).field_name === "__DELETE") {
          sql = 'DELETE FROM "' + locked.rows.item(0).resource_type;
          sql += '" WHERE "id"=' + locked.rows.item(0).resource_id;
          tx.executeSql(sql + ";", [], function(tx, result) {
            if (i < locks.rows.length - 1) {
              return endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback);
            } else {
              sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';';
              tx.executeSql(sql, [], function(tx, result) {});
              return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                return successCallback(200, result);
              }), failureCallback);
            }
          });
        } else {
          sql = "UPDATE \"" + locked.rows.item(0).resource_type + "\" SET ";
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
              sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';';
              tx.executeSql(sql, [], function(tx, result) {
                return console.log("t ok");
              });
              return validateDB(tx, serverModelCache.getSQL(), (function(tx, sqlmod, failureCallback, result) {
                return successCallback(200, result);
              }), failureCallback);
            }
          });
        }
        sql = 'DELETE FROM "conditional_representation" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';';
        tx.executeSql(sql, [], function(tx, result) {
          return console.log("cr ok");
        });
        sql = 'DELETE FROM "resource-is_under-lock" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';';
        return tx.executeSql(sql, [], function(tx, result) {
          return console.log("rl ok");
        });
      });
    });
    sql = 'DELETE FROM "lock-is_shared" WHERE "lock_id"=' + lock_id + ';';
    tx.executeSql(sql, [], function(tx, result) {
      return console.log("ls ok");
    });
    sql = 'DELETE FROM "lock-is_exclusive" WHERE "lock_id"=' + lock_id + ';';
    tx.executeSql(sql, [], function(tx, result) {
      return console.log("le ok");
    });
    sql = 'DELETE FROM "lock-belongs_to-transaction" WHERE "lock_id"=' + lock_id + ';';
    tx.executeSql(sql, [], function(tx, result) {
      return console.log("lt ok");
    });
    sql = 'DELETE FROM "lock" WHERE "id"=' + lock_id;
    return tx.executeSql(sql + ";", [], function(tx, result) {
      return console.log("l ok");
    });
  };
  validateDB = function(tx, sqlmod, successCallback, failureCallback) {
    var errors, l, par, query, row, tex, tot, _i, _len;
    l = [];
    errors = [];
    par = 1;
    tot = 0;
    tex = 0;
    for (_i = 0, _len = sqlmod.length; _i < _len; _i++) {
      row = sqlmod[_i];
      if (row[0] === "rule") {
        query = row[4];
        tot++;
        l[tot] = row[2];
        tx.executeSql(query, [], function(tx, result) {
          tex++;
          if (result.rows.item(0).result === 0) {
            errors.push(l[tex]);
          }
          par *= result.rows.item(0).result;
          if (tot === tex) {
            if (par === 0) {
              failureCallback(errors);
              return tx.executeSql("DROP TABLE '__Fo0oFoo'");
            } else {
              return successCallback(tx, sqlmod, failureCallback, result);
            }
          }
        });
      }
    }
    if (tot === 0) {
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
      tx.executeSql("ALTER TABLE 'resource-is_under-lock' ADD COLUMN resource_type TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_name TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_value TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_type TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN lock_id TEXT", []);
      return successCallback(tx, trnmod, failureCallback, result);
    }), (function(errors) {
      serverModelCache.setModelAreaDisabled(false);
      return failureCallback(errors);
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
        _results.push(tx.executeSql(query, [], (function(tx, result) {
          if (result.rows.item(0)["result"] === 0) {
            return alert("Error: " + l[++k]);
          }
        }), null));
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
  if (typeof window !== "undefined" && window !== null) {
    window.remoteServerRequest = remoteServerRequest;
  }
  if (typeof window !== "undefined" && window !== null) {
    window.db = db;
  }
  if (typeof process !== "undefined" && process !== null) {
    http = require('http');
    http.createServer(function(request, response) {
      var body;
      console.log("Request received");
      body = '';
      request.on('data', function(chunk) {
        body += chunk;
        return console.log('Chunk', chunk);
      });
      return request.on('end', function() {
        console.log('End', body);
        return remoteServerRequest(request.method, request.url, request.headers, body, function(statusCode, result, headers) {
          if (result == null) {
            result = "";
          }
          console.log('Success', result);
          response.writeHead(statusCode, headers);
          return response.end(result);
        }, function(statusCode, errors, headers) {
          console.log('Error', errors);
          response.writeHead(statusCode, headers);
          return response.end(errors);
        });
      });
    }).listen(1337, function() {
      return console.log('Server started');
    });
  }
}).call(this);

(function() {
  var dataGET, dataplusDELETE, dataplusGET, dataplusPOST, dataplusPUT, db, endLock, executePOST, executeSasync, executeTasync, getFTree, getID, hasCR, isExecute, op, rootDELETE, serverModelCache, updateRules, validateDB;
  var __hasProp = Object.prototype.hasOwnProperty;
  op = {
    eq: "=",
    ne: "!=",
    lk: "~"
  };
  serverModelCache = (function() {
    var lastSE, lf, modelAreaDisabled, prepLF, se, serverOnAir, sql, trans;
    serverOnAir = localStorage._server_onAir === "true";
    localStorage._server_onAir = serverOnAir;
    se = localStorage._server_modelAreaValue;
    if (serverOnAir) {
      modelAreaDisabled = localStorage._server_modelAreaDisabled === "true";
      lastSE = localStorage._server_txtmod;
      lf = JSON.parse(localStorage._server_lfmod);
      prepLF = JSON.parse(localStorage._server_prepmod);
      sql = JSON.parse(localStorage._server_sqlmod);
      trans = JSON.parse(localStorage._server_trnmod);
    } else {
      modelAreaDisabled = false;
      lastSE = "";
      lf = [];
      prepLF = [];
      sql = [];
      trans = [];
    }
    return {
      isServerOnAir: function() {
        return serverOnAir;
      },
      setServerOnAir: function(bool) {
        serverOnAir = bool;
        return localStorage._server_onAir = serverOnAir;
      },
      isModelAreaDisabled: function() {
        return modelAreaDisabled;
      },
      setModelAreaDisabled: function(bool) {
        modelAreaDisabled = bool;
        return localStorage._server_modelAreaDisabled = modelAreaDisabled;
      },
      getSE: function() {
        return se;
      },
      setSE: function(txtmod) {
        se = txtmod;
        return localStorage._server_modelAreaValue = se;
      },
      getLastSE: function() {
        return lastSE;
      },
      setLastSE: function(txtmod) {
        lastSE = txtmod;
        return localStorage._server_txtmod = lastSE;
      },
      getLF: function() {
        return lf;
      },
      setLF: function(lfmod) {
        lf = lfmod;
        return localStorage._server_lfmod = JSON.stringify(lf);
      },
      getPrepLF: function() {
        return prepLF;
      },
      setPrepLF: function(prepmod) {
        prepLF = prepmod;
        return localStorage._server_prepmod = JSON.stringify(prepLF);
      },
      getSQL: function() {
        return sql;
      },
      setSQL: function(sqlmod) {
        sql = sqlmod;
        return localStorage._server_sqlmod = JSON.stringify(sql);
      },
      getTrans: function() {
        return trans;
      },
      setTrans: function(trnmod) {
        trans = trnmod;
        return localStorage._server_trnmod = JSON.stringify(trans);
      }
    };
  })();
  db = openDatabase("mydb", "1.0", "my first database", 2 * 1024 * 1024);
  window.remoteServerRequest = function(method, uri, headers, body, successCallback, failureCallback, caller) {
    var ftree, o, rootbranch, tree;
    ftree = [];
    tree = ServerURIParser.matchAll(uri, "uri");
    if ((headers != null) && headers["Content-Type"] === "application/xml") {
      null;
    }
    rootbranch = tree[0].toLowerCase();
    switch (rootbranch) {
      case "onair":
        if (method === "GET") {
          return successCallback({
            "status-line": "HTTP/1.1 200 OK"
          }, JSON.stringify(serverModelCache.isServerOnAir()));
        }
        break;
      case "model":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            return successCallback({
              "status-line": "HTTP/1.1 200 OK"
            }, serverModelCache.getLastSE());
          } else {
            return typeof failureCallback === "function" ? failureCallback({
              "status-line": "HTTP/1.1 404 Not Found"
            }) : void 0;
          }
        }
        break;
      case "lfmodel":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            return successCallback({
              "status-line": "HTTP/1.1 200 OK"
            }, JSON.stringify(serverModelCache.getLF()));
          } else {
            return typeof failureCallback === "function" ? failureCallback({
              "status-line": "HTTP/1.1 404 Not Found"
            }) : void 0;
          }
        }
        break;
      case "prepmodel":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            return successCallback({
              "status-line": "HTTP/1.1 200 OK"
            }, JSON.stringify(serverModelCache.getPrepLF()));
          } else {
            return typeof failureCallback === "function" ? failureCallback({
              "status-line": "HTTP/1.1 404 Not Found"
            }) : void 0;
          }
        }
        break;
      case "sqlmodel":
        if (method === "GET") {
          if (serverModelCache.isServerOnAir()) {
            return successCallback({
              "status-line": "HTTP/1.1 200 OK"
            }, JSON.stringify(serverModelCache.getSQL()));
          } else {
            return typeof failureCallback === "function" ? failureCallback({
              "status-line": "HTTP/1.1 404 Not Found"
            }) : void 0;
          }
        }
        break;
      case "ui":
        if (tree[1][1] === "textarea" && tree[1][3][1][1][3] === "model_area") {
          switch (method) {
            case "PUT":
              serverModelCache.setSE(JSON.parse(body).value);
              return successCallback({
                "status-line": "HTTP/1.1 200 OK"
              });
            case "GET":
              return successCallback({
                "status-line": "HTTP/1.1 200 OK"
              }, JSON.stringify({
                value: serverModelCache.getSE()
              }));
          }
        } else if (tree[1][1] === "textarea-is_disabled" && tree[1][4][1][1][3] === "model_area") {
          switch (method) {
            case "PUT":
              serverModelCache.setModelAreaDisabled(JSON.parse(body).value);
              return successCallback({
                "status-line": "HTTP/1.1 200 OK"
              });
            case "GET":
              return successCallback({
                "status-line": "HTTP/1.1 200 OK"
              }, JSON.stringify({
                value: serverModelCache.isModelAreaDisabled()
              }));
          }
        }
        break;
      case "execute":
        if (method === "POST") {
          return executePOST(tree, headers, body, successCallback, failureCallback, caller);
        }
        break;
      case "update":
        if (method === "POST") {
          return null;
        }
        break;
      case "data":
        if (serverModelCache.isServerOnAir()) {
          if (tree[1] === void 0) {
            switch (method) {
              case "GET":
                return dataGET(tree, headers, body, successCallback, failureCallback, caller);
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
            return successCallback({
              "status-line": "HTTP/1.1 200 OK"
            }, JSON.stringify(o), caller);
          } else {
            switch (method) {
              case "GET":
                console.log("body:[" + body + "]");
                return dataplusGET(tree, headers, body, successCallback, failureCallback, caller);
              case "POST":
                return dataplusPOST(tree, headers, body, successCallback, failureCallback, caller);
              case "PUT":
                return dataplusPUT(tree, headers, body, successCallback, failureCallback, caller);
              case "DELETE":
                return dataplusDELETE(tree, headers, body, successCallback, failureCallback, caller);
            }
          }
        } else {
          return typeof failureCallback === "function" ? failureCallback({
            "status-line": "HTTP/1.1 404 Not Found"
          }) : void 0;
        }
        break;
      default:
        if (method === "DELETE") {
          return rootDELETE(tree, headers, body, successCallback, failureCallback, caller);
        }
    }
  };
  dataplusDELETE = function(tree, headers, body, successCallback, failureCallback, caller) {
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
                return validateDB(tx, serverModelCache.getSQL(), caller, (function(tx, sqlmod, caller, failureCallback, headers, result) {
                  return successCallback(headers, result, caller);
                }), failureCallback, {
                  "status-line": "HTTP/1.1 200 OK"
                }, "");
              });
            } else {
              return failureCallback(["The resource is locked and cannot be deleted"]);
            }
          });
        }), function(err) {});
      }
    }
  };
  dataplusPUT = function(tree, headers, body, successCallback, failureCallback, caller) {
    var bd, errs, id, k, pair, ps, _ref;
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
      errs = [];
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
                return validateDB(tx, serverModelCache.getSQL(), caller, (function(tx, sqlmod, caller, failureCallback, headers, result) {
                  return successCallback(headers, result, caller);
                }), failureCallback, {
                  "status-line": "HTTP/1.1 200 OK"
                }, "");
              });
            }
          } else {
            return failureCallback(["The resource is locked and cannot be edited"]);
          }
        });
      }), function(err) {});
    }
  };
  dataplusPOST = function(tree, headers, body, successCallback, failureCallback, caller) {
    var bd, fds, id, k, pair, sql, vls, _ref;
    if (tree[1][1] === "transaction" && isExecute(tree)) {
      id = getID(tree);
      return db.transaction((function(tx) {
        var sql;
        sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";";
        return tx.executeSql(sql, [], function(tx, locks) {
          return endLock(tx, locks, 0, id, caller, successCallback, failureCallback);
        });
      }), function(error) {
        return db.transaction(function(tx) {
          var sql;
          sql = 'SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id"=' + id + ";";
          return tx.executeSql(sql, [], function(tx, locks) {
            var i, lock_id;
            i = 0;
            while (i < locks.rows.length) {
              lock_id = locks.rows.item(0).lock_id;
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
              i++;
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
        return tx.executeSql(sql, [], function(tx, result) {
          return validateDB(tx, serverModelCache.getSQL(), caller, (function(tx, sqlmod, caller, failureCallback, headers, result) {
            return successCallback(headers, result, caller);
          }), failureCallback, {
            "status-line": "HTTP/1.1 201 Created",
            location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + result.insertId
          }, "");
        });
      });
    }
  };
  executePOST = function(tree, headers, body, successCallback, failureCallback, caller) {
    var lfmod, prepmod, se, sqlmod, trnmod;
    se = serverModelCache.getSE();
    lfmod = SBVRParser.matchAll(se, "expr");
    console.log(lfmod);
    prepmod = SBVR_PreProc.match(lfmod, "optimizeTree");
    sqlmod = SBVR2SQL.match(prepmod, "trans");
    tree = SBVRParser.matchAll(modelT, "expr");
    tree = SBVR_PreProc.match(tree, "optimizeTree");
    trnmod = SBVR2SQL.match(tree, "trans");
    serverModelCache.setModelAreaDisabled(true);
    return db.transaction(function(tx) {
      return executeSasync(tx, sqlmod, caller, (function(tx, sqlmod, caller, failureCallback, headers, result) {
        return executeTasync(tx, trnmod, caller, (function(tx, trnmod, caller, failureCallback, headers, result) {
          serverModelCache.setServerOnAir(true);
          serverModelCache.setLastSE(se);
          serverModelCache.setLF(lfmod);
          serverModelCache.setPrepLF(prepmod);
          serverModelCache.setSQL(sqlmod);
          serverModelCache.setTrans(trnmod);
          return successCallback(headers, result);
        }), failureCallback, headers, result);
      }), (function(errors) {
        serverModelCache.setModelAreaDisabled(false);
        return failureCallback(errors);
      }), {
        "status-line": "HTTP/1.1 200 OK"
      });
    });
  };
  rootDELETE = function(tree, headers, body, successCallback, failureCallback, caller) {
    db.transaction((function(sqlmod) {
      return function(tx) {
        var i, _results;
        i = 1;
        _results = [];
        while (i < sqlmod.length) {
          if (sqlmod[i][0] === "fcTp" || sqlmod[i][0] === "term") {
            tx.executeSql(sqlmod[i][5]);
          }
          _results.push(i++);
        }
        return _results;
      };
    })(serverModelCache.getSQL()));
    db.transaction((function(trnmod) {
      return function(tx) {
        var i, _results;
        i = 1;
        _results = [];
        while (i < trnmod.length) {
          if (trnmod[i][0] === "fcTp" || trnmod[i][0] === "term") {
            tx.executeSql(trnmod[i][5]);
          }
          _results.push(i++);
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
    return successCallback({
      "status-line": "HTTP/1.1 200 OK"
    }, "");
  };
  dataGET = function(tree, headers, body, successCallback, failureCallback, caller) {
    var ents, i, result, sqlmod;
    result = {};
    ents = [];
    sqlmod = serverModelCache.getSQL();
    i = 1;
    while (i < sqlmod.length) {
      if (sqlmod[i][0] === "term") {
        ents.push({
          id: sqlmod[i][1],
          name: sqlmod[i][2]
        });
      }
      i++;
    }
    result.terms = ents;
    ents = [];
    i = 1;
    while (i < sqlmod.length) {
      if (sqlmod[i][0] === "fcTp") {
        ents.push({
          id: sqlmod[i][1],
          name: sqlmod[i][2]
        });
      }
      i++;
    }
    result.fcTps = ents;
    return successCallback({
      "status-line": "HTTP/1.1 200 OK"
    }, JSON.stringify(result), caller);
  };
  dataplusGET = function(tree, headers, body, successCallback, failureCallback, caller) {
    var ftree;
    ftree = getFTree(tree);
    return db.transaction(function(tx) {
      var filts, fl, ft, i, j, jn, obj, sql, tb;
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
        i = 1;
        while (i < tree[1][2].length) {
          fl.push("'" + tree[1][2][i] + "'" + ".'id' AS '" + tree[1][2][i] + "_id'");
          fl.push("'" + tree[1][2][i] + "'" + ".'name' AS '" + tree[1][2][i] + "_name'");
          tb.push("'" + tree[1][2][i] + "'");
          jn.push("'" + tree[1][2][i] + "'" + ".'id' = " + "'" + ft + "'" + "." + "'" + tree[1][2][i] + "_id" + "'");
          i++;
        }
        sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ");
        if (ftree.length !== 1) {
          sql += " AND ";
        }
      }
      if (ftree.length !== 1) {
        filts = [];
        i = 1;
        while (i < ftree.length) {
          if (ftree[i][0] === "filt") {
            j = 1;
            while (j < ftree[i].length) {
              obj = "";
              if (ftree[i][j][1][0] !== void 0) {
                obj = "'" + ftree[i][j][1] + "'" + ".";
              }
              filts.push(obj + "'" + ftree[i][j][2] + "'" + op[ftree[i][j][0]] + ftree[i][j][3]);
              j++;
            }
          } else if (ftree[i][0] === "sort") {
            null;
          }
          i++;
        }
        sql += filts.join(" AND ");
      }
      if (sql !== "") {
        return tx.executeSql(sql + ";", [], function(tx, result) {
          var ents, reslt;
          reslt = {};
          ents = [];
          i = 0;
          while (i < result.rows.length) {
            ents.push(result.rows.item(i));
            i++;
          }
          reslt["instances"] = ents;
          return successCallback({
            "status-line": "HTTP/1.1 200 OK"
          }, JSON.stringify(reslt), caller);
        });
      }
    });
  };
  endLock = function(tx, locks, i, trans_id, caller, successCallback, failureCallback) {
    var lock_id, sql;
    lock_id = locks.rows.item(i).lock_id;
    sql = 'SELECT * FROM "conditional_representation" WHERE "lock_id"=' + lock_id + ';';
    tx.executeSql(sql, [], function(tx, crs) {
      sql = 'SELECT * FROM "resource-is_under-lock" WHERE "lock_id"=' + crs.rows.item(0).lock_id + ';';
      return tx.executeSql(sql, [], function(tx, locked) {
        var j;
        if (crs.rows.item(0).field_name === "__DELETE") {
          sql = 'DELETE FROM "' + locked.rows.item(0).resource_type;
          sql += '" WHERE "id"=' + locked.rows.item(0).resource_id;
          tx.executeSql(sql + ";", [], function(tx, result) {
            if (i < locks.rows.length - 1) {
              return endLock(tx, locks, i + 1, trans_id, caller, successCallback, failureCallback);
            } else {
              sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';';
              tx.executeSql(sql, [], function(tx, result) {});
              return validateDB(tx, serverModelCache.getSQL(), caller, (function(tx, sqlmod, caller, failureCallback, headers, result) {
                return successCallback(headers, result, caller);
              }), failureCallback, {
                "status-line": "HTTP/1.1 200 OK"
              }, "");
            }
          });
        } else {
          sql = "UPDATE \"" + locked.rows.item(0).resource_type + "\" SET ";
          j = 0;
          while (j < crs.rows.length) {
            sql += '"' + crs.rows.item(j).field_name + '"=';
            if (crs.rows.item(j).field_type === "string") {
              sql += '"' + crs.rows.item(j).field_value + '"';
            } else {
              sql += crs.rows.item(j).field_value;
            }
            if (j < crs.rows.length - 1) {
              sql += ", ";
            }
            j++;
          }
          sql += ' WHERE "id"=' + locked.rows.item(0).resource_id + ';';
          tx.executeSql(sql, [], function(tx, result) {
            if (i < locks.rows.length - 1) {
              return endLock(tx, locks, i + 1, trans_id, caller, successCallback, failureCallback);
            } else {
              sql = 'DELETE FROM "transaction" WHERE "id"=' + trans_id + ';';
              tx.executeSql(sql, [], function(tx, result) {
                return console.log("t ok");
              });
              return validateDB(tx, serverModelCache.getSQL(), caller, (function(tx, sqlmod, caller, failureCallback, headers, result) {
                return successCallback(headers, result, caller);
              }), failureCallback, {
                "status-line": "HTTP/1.1 200 OK"
              }, "");
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
    sql = "DELETE FROM \"lock\" WHERE \"id\"=" + lock_id;
    return tx.executeSql(sql + ";", [], function(tx, result) {
      return console.log("l ok");
    });
  };
  validateDB = function(tx, sqlmod, caller, successCallback, failureCallback, headers, result) {
    var errors, h, k, l, m, par, query, tex, tot;
    k = 0;
    m = 0;
    l = [];
    errors = [];
    par = 1;
    tot = 0;
    tex = 0;
    h = 0;
    while (h < sqlmod.length) {
      if (sqlmod[h][0] === "rule") {
        query = sqlmod[h][4];
        tot++;
        l[tot] = sqlmod[h][2];
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
              return successCallback(tx, sqlmod, caller, failureCallback, headers, result);
            }
          }
        });
      }
      h++;
    }
    if (tot === 0) {
      return successCallback(tx, sqlmod, caller, failureCallback, headers, result);
    }
  };
  executeSasync = function(tx, sqlmod, caller, successCallback, failureCallback, headers, result) {
    var i, k, l, m;
    k = 0;
    m = 0;
    l = [];
    i = 0;
    while (i < sqlmod.length) {
      if (sqlmod[i][0] === "fcTp" || sqlmod[i][0] === "term") {
        tx.executeSql(sqlmod[i][4]);
      }
      i++;
    }
    return validateDB(tx, sqlmod, caller, successCallback, failureCallback, headers, "");
  };
  executeTasync = function(tx, trnmod, caller, successCallback, failureCallback, headers, result) {
    return executeSasync(tx, trnmod, caller, (function(tx, trnmod, caller, failureCallback, headers, result) {
      tx.executeSql("ALTER TABLE 'resource-is_under-lock' ADD COLUMN resource_type TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_name TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_value TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN field_type TEXT", []);
      tx.executeSql("ALTER TABLE 'conditional_representation' ADD COLUMN lock_id TEXT", []);
      return successCallback(tx, trnmod, caller, failureCallback, headers, result);
    }), (function(errors) {
      serverModelCache.setModelAreaDisabled(false);
      return failureCallback(errors);
    }), headers, result);
  };
  updateRules = function(sqlmod) {
    var i, query, _results;
    i = 0;
    while (i < sqlmod.length) {
      if (sqlmod[i][0] === "fcTp" || sqlmod[i][0] === "term") {
        tx.executeSql(sqlmod[i][4]);
      }
      i++;
    }
    i = 0;
    _results = [];
    while (i < sqlmod.length) {
      if (sqlmod[i][0] === "rule") {
        query = sqlmod[i][4];
        l[++m] = sqlmod[i][2];
        tx.executeSql(query, [], (function(tx, result) {
          if (result.rows.item(0)["result"] === 0) {
            return alert("Error: " + l[++k]);
          }
        }), null);
      }
      _results.push(i++);
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
}).call(this);

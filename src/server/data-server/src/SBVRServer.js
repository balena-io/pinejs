(function() {
  var __hasProp = Object.prototype.hasOwnProperty;

  define(['SBVRParser', 'sbvr-compiler/LF2AbstractSQLPrep', 'SBVR2SQL', 'data-server/ServerURIParser'], function(SBVRParser, LF2AbstractSQLPrep, SBVR2SQL, ServerURIParser) {
    var db, endLock, executeSasync, executeTasync, exports, getFTree, getID, hasCR, isExecute, op, parseURITree, serverIsOnAir, serverModelCache, transactionModel, updateRules, validateDB;
    exports = {};
    db = null;
    op = {
      eq: "=",
      ne: "!=",
      lk: "~"
    };
    transactionModel = 'Term:      resource\nTerm:      transaction\nTerm:      lock\nTerm:      conditional representation\nFact type: lock is exclusive\nFact type: lock is shared\nFact type: resource is under lock\nFact type: lock belongs to transaction\nRule:      It is obligatory that each resource is under at most 1 lock that is exclusive';
    transactionModel = SBVRParser.matchAll(transactionModel, "expr");
    transactionModel = LF2AbstractSQLPrep.match(transactionModel, "Process");
    transactionModel = SBVR2SQL.match(transactionModel, "trans");
    serverModelCache = function() {
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
        tx.executeSql('CREATE TABLE ' + '"_server_model_cache" (' + '"key"		VARCHAR(40) PRIMARY KEY,' + '"value"	VARCHAR(32768) );');
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
          value = JSON.stringify(value);
          return tx.executeSql('SELECT 1 FROM "_server_model_cache" WHERE "key" = ?;', [key], function(tx, result) {
            if (result.rows.length === 0) {
              return tx.executeSql('INSERT INTO "_server_model_cache" VALUES (?, ?);', [key, value], null, null, false);
            } else {
              return tx.executeSql('UPDATE "_server_model_cache" SET value = ? WHERE "key" = ?;', [value, key]);
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
    };
    endLock = function(tx, locks, i, trans_id, successCallback, failureCallback) {
      var continueEndingLock, lock_id;
      continueEndingLock = function(tx, result) {
        if (i < locks.rows.length - 1) {
          return endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback);
        } else {
          tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [trans_id]);
          return validateDB(tx, serverModelCache.getSQL(), successCallback, failureCallback);
        }
      };
      lock_id = locks.rows.item(i).lock_id;
      tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id], function(tx, crs) {
        return tx.executeSql('SELECT * FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [lock_id], function(tx, locked) {
          var item, j, sql, _ref;
          if (crs.rows.item(0).field_name === "__DELETE") {
            tx.executeSql('DELETE FROM "' + locked.rows.item(0).resource_type + '" WHERE "id" = ?;', [locked.rows.item(0).resource_id], continueEndingLock);
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
              if (j < crs.rows.length - 1) sql += ", ";
            }
            sql += ' WHERE "id"=' + locked.rows.item(0).resource_id + ';';
            tx.executeSql(sql, [], continueEndingLock);
          }
          tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [lock_id]);
          return tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock_id" = ?;', [lock_id]);
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
        if (!(row[0] === "rule")) continue;
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
                return failureCallback(errors);
              } else {
                tx.end();
                return successCallback(tx, result);
              }
            }
          };
        })(row));
      }
      if (totalQueries === 0) return successCallback(tx, "");
    };
    executeSasync = function(tx, sqlmod, successCallback, failureCallback, result) {
      var row, _i, _len, _ref;
      for (_i = 0, _len = sqlmod.length; _i < _len; _i++) {
        row = sqlmod[_i];
        if ((_ref = row[0]) === "fcTp" || _ref === "term") tx.executeSql(row[4]);
      }
      return validateDB(tx, sqlmod, successCallback, failureCallback);
    };
    executeTasync = function(tx, trnmod, successCallback, failureCallback, result) {
      return executeSasync(tx, trnmod, function(tx, result) {
        tx.executeSql('ALTER TABLE "resource-is_under-lock" ADD COLUMN resource_type TEXT');
        tx.executeSql('ALTER TABLE "resource-is_under-lock" DROP CONSTRAINT "resource-is_under-lock_resource_id_fkey";');
        tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN field_name TEXT');
        tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN field_value TEXT');
        tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN field_type TEXT');
        tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN lock_id INTEGER');
        return successCallback(tx, result);
      }, function(errors) {
        serverModelCache.setModelAreaDisabled(false);
        return failureCallback(errors);
      }, result);
    };
    updateRules = function(sqlmod) {
      var query, row, _i, _j, _len, _len2, _ref, _results;
      for (_i = 0, _len = sqlmod.length; _i < _len; _i++) {
        row = sqlmod[_i];
        if ((_ref = row[0]) === "fcTp" || _ref === "term") tx.executeSql(row[4]);
      }
      _results = [];
      for (_j = 0, _len2 = sqlmod.length; _j < _len2; _j++) {
        row = sqlmod[_j];
        if (!(row[0] === "rule")) continue;
        query = row[4];
        l[++m] = row[2];
        _results.push(tx.executeSql(query, [], function(tx, result) {
          var _ref2;
          if ((_ref2 = result.rows.item(0).result) === 0 || _ref2 === false) {
            return alert("Error: " + l[++k]);
          }
        }));
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
      if (id === "") id = 0;
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
        if (f[0] === "cr") return true;
      }
      return false;
    };
    isExecute = function(tree) {
      var f, _i, _len, _ref;
      _ref = getFTree(tree);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        f = _ref[_i];
        if (f[0] === "execute") return true;
      }
      return false;
    };
    serverIsOnAir = function(req, res, next) {
      if (serverModelCache.isServerOnAir()) {
        return next();
      } else {
        return next('route');
      }
    };
    parseURITree = function(req, res, next) {
      if (!(req.tree != null)) {
        try {
          req.tree = ServerURIParser.matchAll(req.url, "uri");
        } catch (e) {
          req.tree = false;
        }
      }
      if (req.tree === false) {
        return next('route');
      } else {
        return next();
      }
    };
    exports.setup = function(app, requirejs) {
      requirejs(['database-layer/db'], function(dbModule) {
        if (typeof process !== "undefined" && process !== null) {
          db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres");
        } else {
          db = dbModule.websql('rulemotion');
        }
        return serverModelCache = serverModelCache();
      });
      app.get('/onair', function(req, res, next) {
        return res.json(serverModelCache.isServerOnAir());
      });
      app.get('/model', serverIsOnAir, function(req, res, next) {
        return res.json(serverModelCache.getLastSE());
      });
      app.get('/lfmodel', serverIsOnAir, function(req, res, next) {
        return res.json(serverModelCache.getLF());
      });
      app.get('/prepmodel', serverIsOnAir, function(req, res, next) {
        return res.json(serverModelCache.getPrepLF());
      });
      app.get('/sqlmodel', serverIsOnAir, function(req, res, next) {
        return res.json(serverModelCache.getSQL());
      });
      app.post('/update', serverIsOnAir, function(req, res, next) {
        return res.send(404);
      });
      app.post('/execute', function(req, res, next) {
        var lfmod, prepmod, se, sqlmod;
        se = serverModelCache.getSE();
        try {
          lfmod = SBVRParser.matchAll(se, "expr");
        } catch (e) {
          console.log('Error parsing model', e);
          res.json('Error parsing model', 404);
          return null;
        }
        prepmod = LF2AbstractSQLPrep.match(lfmod, "Process");
        sqlmod = SBVR2SQL.match(prepmod, "trans");
        return db.transaction(function(tx) {
          tx.begin();
          return executeSasync(tx, sqlmod, function(tx, result) {
            return executeTasync(tx, transactionModel, function(tx, result) {
              serverModelCache.setModelAreaDisabled(true);
              serverModelCache.setServerOnAir(true);
              serverModelCache.setLastSE(se);
              serverModelCache.setLF(lfmod);
              serverModelCache.setPrepLF(prepmod);
              serverModelCache.setSQL(sqlmod);
              serverModelCache.setTrans(transactionModel);
              return res.json(result);
            }, function(errors) {
              return res.json(errors, 404);
            }, result);
          }, function(errors) {
            return res.json(errors, 404);
          });
        });
      });
      app.del('/cleardb', function(req, res, next) {
        return db.transaction(function(tx) {
          return tx.tableList(function(tx, result) {
            var i, _ref;
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tx.dropTable(result.rows.item(i).name);
            }
            return res.send(200);
          });
        });
      });
      app.put('/importdb', function(req, res, next) {
        var imported, queries;
        queries = req.body.split(";");
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
        return res.send(200);
      });
      app.get('/exportdb', function(req, res, next) {
        var env;
        if (typeof process !== "undefined" && process !== null) {
          env = process.env;
          env['PGPASSWORD'] = '.';
          req = require;
          return req('child_process').exec('pg_dump --clean -U postgres -h localhost -p 5432', {
            env: env
          }, function(error, stdout, stderr) {
            console.log(stdout, stderr);
            return res.json(stdout);
          });
        } else {
          return db.transaction(function(tx) {
            return tx.tableList(function(tx, result) {
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
                      return res.json(exported);
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
              if (exportsProcessed === totalExports) return res.json(exported);
            }, null, "name NOT LIKE '%_buk'");
          });
        }
      });
      app.post('/backupdb', serverIsOnAir, function(req, res, next) {
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
        return res.send(200);
      });
      app.post('/restoredb', serverIsOnAir, function(req, res, next) {
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
        return res.send(200);
      });
      app.get('/ui/*', parseURITree, function(req, res, next) {
        if (req.tree[1][1] === "textarea" && req.tree[1][3][1][1][3] === "model_area") {
          return res.json({
            value: serverModelCache.getSE()
          });
        } else if (req.tree[1][1] === "textarea-is_disabled" && req.tree[1][4][1][1][3] === "model_area") {
          return res.json({
            value: serverModelCache.isModelAreaDisabled()
          });
        } else {
          return res.send(404);
        }
      });
      app.put('/ui/*', parseURITree, function(req, res, next) {
        if (req.tree[1][1] === "textarea" && req.tree[1][3][1][1][3] === "model_area") {
          serverModelCache.setSE(req.body.value);
          return res.send(200);
        } else if (req.tree[1][1] === "textarea-is_disabled" && req.tree[1][4][1][1][3] === "model_area") {
          serverModelCache.setModelAreaDisabled(req.body.value);
          return res.send(200);
        } else {
          return res.send(404);
        }
      });
      app.get('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        var filts, fl, ft, ftree, jn, obj, result, row, row2, sql, sqlmod, tb, tree, _i, _j, _k, _l, _len, _len2, _len3, _len4, _ref, _ref2, _ref3, _ref4;
        tree = req.tree;
        if (tree[1] === void 0) {
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
          return res.json(result);
        } else if (tree[1][1] === "transaction") {
          return res.json({
            id: tree[1][3][1][1][3],
            tcURI: "/transaction",
            lcURI: "/data/lock",
            tlcURI: "/data/lock-belongs_to-transaction",
            rcURI: "/data/resource",
            lrcURI: "/data/resource-is_under-lock",
            slcURI: "/data/lock-is_shared",
            xlcURI: "/data/lock-is_exclusive",
            ctURI: "/data/transaction*filt:transaction.id=" + tree[1][3][1][1][3] + "/execute"
          });
        } else {
          ftree = getFTree(tree);
          sql = "";
          if (tree[1][0] === "term") {
            sql = "SELECT * FROM " + tree[1][1];
            if (ftree.length !== 1) sql += " WHERE ";
          } else if (tree[1][0] === "fcTp") {
            ft = tree[1][1];
            fl = ['"' + ft + '".id AS id'];
            jn = [];
            tb = ['"' + ft + '"'];
            _ref2 = tree[1][2].slice(1);
            for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
              row = _ref2[_j];
              fl.push('"' + row + '".id AS "' + row + '_id"');
              fl.push('"' + row + '".name AS "' + row + '_name"');
              tb.push('"' + row + '"');
              jn.push('"' + row + '".id = "' + ft + '"."' + row + '_id"');
            }
            sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ");
            if (ftree.length !== 1) sql += " AND ";
          }
          if (ftree.length !== 1) {
            filts = [];
            _ref3 = ftree.slice(1);
            for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
              row = _ref3[_k];
              if (row[0] === "filt") {
                _ref4 = row.slice(1);
                for (_l = 0, _len4 = _ref4.length; _l < _len4; _l++) {
                  row2 = _ref4[_l];
                  obj = "";
                  if (row2[1][0] != null) obj = '"' + row2[1] + '".';
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
                    var _ref5, _results;
                    _results = [];
                    for (i = 0, _ref5 = result.rows.length; 0 <= _ref5 ? i < _ref5 : i > _ref5; 0 <= _ref5 ? i++ : i--) {
                      _results.push(result.rows.item(i));
                    }
                    return _results;
                  })()
                };
                return res.json(data);
              });
            });
          } else {
            return res.send(404);
          }
        }
      });
      app.post('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        var binds, field, fields, i, id, pair, tree, value, values, _ref;
        if (req.tree[1] === void 0) {
          return res.send(404);
        } else {
          tree = req.tree;
          if (tree[1][1] === "transaction" && isExecute(tree)) {
            id = getID(tree);
            return db.transaction((function(tx) {
              return tx.executeSql('SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction_id" = ?;', [id], function(tx, locks) {
                return endLock(tx, locks, 0, id, function(tx, result) {
                  return res.json(result);
                }, function(errors) {
                  return res.json(errors, 404);
                });
              });
            }));
          } else {
            fields = [];
            values = [];
            binds = [];
            _ref = req.body;
            for (i in _ref) {
              if (!__hasProp.call(_ref, i)) continue;
              pair = _ref[i];
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
                return validateDB(tx, serverModelCache.getSQL(), function(tx, result) {
                  return res.json(result, {
                    location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + sqlResult.insertId
                  }, 201);
                }, function(errors) {
                  return res.json(errors, 404);
                });
              });
            });
          }
        }
      });
      app.put('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        var id, tree;
        if (req.tree[1] === void 0) {
          return res.send(404);
        } else {
          tree = req.tree;
          id = getID(tree);
          if (tree[1][1] === "lock" && hasCR(tree)) {
            return db.transaction(function(tx) {
              var key, pair, sql, value, _i, _len, _ref;
              tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]);
              sql = 'INSERT INTO "conditional_representation"' + '("lock_id","field_name","field_type","field_value")' + "VALUES (?, ?, ?, ?)";
              _ref = req.body;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                pair = _ref[_i];
                for (key in pair) {
                  if (!__hasProp.call(pair, key)) continue;
                  value = pair[key];
                  tx.executeSql(sql, [id, key, typeof value, value]);
                }
              }
              return res.send(200);
            });
          } else {
            return db.transaction((function(tx) {
              return tx.executeSql('SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], function(tx, result) {
                var binds, key, pair, setStatements, value, _i, _len, _ref, _ref2;
                if ((_ref = result.rows.item(0).result) === 1 || _ref === true) {
                  if (id !== "") {
                    setStatements = [];
                    binds = [];
                    _ref2 = req.body;
                    for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
                      pair = _ref2[_i];
                      for (key in pair) {
                        if (!__hasProp.call(pair, key)) continue;
                        value = pair[key];
                        setStatements.push('"' + key + '"= ?');
                        binds.push(value);
                      }
                    }
                    binds.push(id);
                    tx.begin();
                    return tx.executeSql('UPDATE "' + tree[1][1] + '" SET ' + setStatements.join(", ") + " WHERE id = ?;", binds, function(tx) {
                      return validateDB(tx, serverModelCache.getSQL(), function(tx, result) {
                        tx.end();
                        return res.json(result);
                      }, function(errors) {
                        return res.json(errors, 404);
                      });
                    });
                  }
                } else {
                  return res.json(["The resource is locked and cannot be edited"], 404);
                }
              });
            }));
          }
        }
      });
      app.del('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        var id, tree;
        tree = req.tree;
        if (tree[1] === void 0) {
          return res.send(404);
        } else {
          id = getID(tree);
          if (id !== 0) {
            if (tree[1][1] === "lock" && hasCR(tree)) {
              return db.transaction(function(tx) {
                tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock_id" = ?;', [id]);
                tx.executeSql('INSERT INTO "conditional_representation" ("lock_id","field_name","field_type","field_value")' + "VALUES (?,'__DELETE','','')", [id]);
                return res.send(200);
              });
            } else {
              return db.transaction((function(tx) {
                return tx.executeSql('SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource_id" = ?) AS result;', [tree[1][1], id], function(tx, result) {
                  var _ref;
                  if ((_ref = result.rows.item(0).result) === 1 || _ref === true) {
                    tx.begin();
                    return tx.executeSql('DELETE FROM "' + tree[1][1] + '" WHERE id = ?;', [id], function(tx, result) {
                      return validateDB(tx, serverModelCache.getSQL(), function(tx, result) {
                        tx.end();
                        return res.json(result);
                      }, function(errors) {
                        return res.json(errors, 404);
                      });
                    });
                  } else {
                    return res.json(["The resource is locked and cannot be deleted"], 404);
                  }
                });
              }));
            }
          }
        }
      });
      return app.del('/', serverIsOnAir, function(req, res, next) {
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
        return res.send(200);
      });
    };
    return exports;
  });

}).call(this);

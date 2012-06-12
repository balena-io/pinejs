(function() {
  var __hasProp = Object.prototype.hasOwnProperty;

  define(['sbvr-parser/SBVRParser', 'sbvr-compiler/LF2AbstractSQLPrep', 'sbvr-compiler/LF2AbstractSQL', 'sbvr-compiler/AbstractSQL2SQL', 'data-server/ServerURIParser'], function(SBVRParser, LF2AbstractSQLPrep, LF2AbstractSQL, AbstractSQL2SQL, ServerURIParser) {
    var db, endLock, executeSasync, executeTasync, exports, getCorrectTableInfo, getFTree, getID, hasCR, isExecute, op, parseURITree, rebuildFactType, serverIsOnAir, serverModelCache, transactionModel, updateRules, validateDB;
    exports = {};
    db = null;
    transactionModel = null;
    op = {
      eq: "=",
      ne: "!=",
      lk: "~"
    };
    rebuildFactType = function(factType) {
      var factTypePart, key, _len;
      factType = factType.split('-');
      for (key = 0, _len = factType.length; key < _len; key++) {
        factTypePart = factType[key];
        factTypePart = factTypePart.replace(/_/g, ' ');
        if (key % 2 === 0) {
          factType[key] = ['Term', factTypePart];
        } else {
          factType[key] = ['Verb', factTypePart];
        }
      }
      return factType;
    };
    getCorrectTableInfo = function(oldTableName) {
      var attributeName, factType, isAttribute, sqlmod, table;
      sqlmod = serverModelCache.getSQL();
      isAttribute = false;
      attributeName = null;
      factType = rebuildFactType(oldTableName);
      if (sqlmod.tables.hasOwnProperty(factType)) {
        if (sqlmod.tables[factType] === 'Attribute') {
          isAttribute = {
            termName: factType[0][1],
            attributeName: factType[1][1]
          };
          table = sqlmod.tables[isAttribute.termName];
        } else {
          table = sqlmod.tables[factType];
        }
      } else if (transactionModel.tables.hasOwnProperty(factType)) {
        if (transactionModel.tables[factType] === 'Attribute') {
          isAttribute = {
            termName: factType[0][1],
            attributeName: factType[1][1]
          };
          table = transactionModel.tables[isAttribute.termName];
        } else {
          table = transactionModel.tables[factType];
        }
      } else if (sqlmod.tables.hasOwnProperty(oldTableName)) {
        table = sqlmod.tables[oldTableName];
      } else {
        table = transactionModel.tables[oldTableName];
      }
      return {
        table: table,
        isAttribute: isAttribute
      };
    };
    serverModelCache = function() {
      var pendingCallbacks, setValue, values;
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
      pendingCallbacks = [];
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
      serverModelCache = {
        whenLoaded: function(func) {
          return pendingCallbacks.push(func);
        },
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
      return db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE ' + '"_server_model_cache" (' + '"key"		VARCHAR(40) PRIMARY KEY,' + '"value"	VARCHAR(32768) );');
        return tx.executeSql('SELECT * FROM "_server_model_cache";', [], function(tx, result) {
          var callback, i, row, _i, _len, _ref, _results;
          for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
            row = result.rows.item(i);
            values[row.key] = JSON.parse(row.value);
          }
          serverModelCache.whenLoaded = function(func) {
            return func();
          };
          _results = [];
          for (_i = 0, _len = pendingCallbacks.length; _i < _len; _i++) {
            callback = pendingCallbacks[_i];
            _results.push(callback());
          }
          return _results;
        });
      });
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
      lock_id = locks.rows.item(i).lock;
      tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], function(tx, crs) {
        return tx.executeSql('SELECT * FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id], function(tx, locked) {
          var isAttribute, item, j, sql, table, _ref, _ref2;
          _ref = getCorrectTableInfo(locked.rows.item(0).resource_type), table = _ref.table, isAttribute = _ref.isAttribute;
          if (crs.rows.item(0).field_name === "__DELETE") {
            if (isAttribute) {
              sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 0 WHERE "' + table.idField + '" = ?;';
            } else {
              sql = 'DELETE FROM "' + table.name + '" WHERE "' + table.idField + '" = ?;';
            }
            tx.executeSql(sql, [locked.rows.item(0).resource], continueEndingLock);
          } else {
            sql = 'UPDATE "' + table.name + '" SET ';
            for (j = 0, _ref2 = crs.rows.length; 0 <= _ref2 ? j < _ref2 : j > _ref2; 0 <= _ref2 ? j++ : j--) {
              item = crs.rows.item(j);
              sql += '"' + item.field_name + '"=';
              if (item.field_type === "string") {
                sql += '"' + item.field_value + '"';
              } else {
                sql += item.field_value;
              }
              if (j < crs.rows.length - 1) sql += ", ";
            }
            sql += ' WHERE "' + table.idField + '"=' + locked.rows.item(0).resource + ';';
            tx.executeSql(sql, [], continueEndingLock);
          }
          tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [lock_id]);
          return tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id]);
        });
      });
      tx.executeSql('DELETE FROM "lock-belongs_to-transaction" WHERE "lock" = ?;', [lock_id]);
      return tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lock_id]);
    };
    validateDB = function(tx, sqlmod, successCallback, failureCallback) {
      var errors, rule, totalExecuted, totalQueries, _i, _len, _ref;
      errors = [];
      totalQueries = 0;
      totalExecuted = 0;
      _ref = sqlmod.rules;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rule = _ref[_i];
        totalQueries++;
        tx.executeSql(rule.sql, [], (function(rule) {
          return function(tx, result) {
            var _ref2;
            totalExecuted++;
            if ((_ref2 = result.rows.item(0).result) === false || _ref2 === 0) {
              errors.push(rule.text);
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
        })(rule));
      }
      if (totalQueries === 0) return successCallback(tx, "");
    };
    executeSasync = function(tx, sqlmod, successCallback, failureCallback, result) {
      var createStatement, _i, _len, _ref;
      _ref = sqlmod.createSchema;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        createStatement = _ref[_i];
        tx.executeSql(createStatement);
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
        tx.executeSql('ALTER TABLE "conditional_representation" ADD COLUMN lock INTEGER');
        return successCallback(tx, result);
      }, function(errors) {
        serverModelCache.setModelAreaDisabled(false);
        return failureCallback(errors);
      }, result);
    };
    updateRules = function(sqlmod) {
      var createStatement, rule, _i, _j, _len, _len2, _ref, _ref2, _results;
      _ref = sqlmod.createSchema;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        createStatement = _ref[_i];
        tx.executeSql(createStatement);
      }
      _ref2 = sqlmod.rules;
      _results = [];
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        rule = _ref2[_j];
        l[++m] = rule.text;
        _results.push(tx.executeSql(rule.sql, [], function(tx, result) {
          var _ref3;
          if ((_ref3 = result.rows.item(0).result) === 0 || _ref3 === false) {
            return alert("Error: " + l[++k]);
          }
        }));
      }
      return _results;
    };
    getFTree = function(tree) {
      if (tree[1][0] === "Term") {
        return tree[1][3];
      } else if (tree[1][0] === "FactType") {
        return tree[1][4];
      }
      return [];
    };
    getID = function(tree) {
      var f, ftree, id, _i, _len, _ref;
      if (tree[1][0] === "Term") {
        id = tree[1][2];
      } else if (tree[1][0] === "FactType") {
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
      return serverModelCache.whenLoaded(function() {
        if (serverModelCache.isServerOnAir()) {
          return next();
        } else {
          return next('route');
        }
      });
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
          AbstractSQL2SQL = AbstractSQL2SQL.postgres;
        } else {
          db = dbModule.websql('rulemotion');
          AbstractSQL2SQL = AbstractSQL2SQL.websql;
        }
        serverModelCache();
        transactionModel = 'Term:      resource\nTerm:      transaction\nTerm:      lock\nTerm:      conditional representation\nFact type: lock is exclusive\nFact type: lock is shared\nFact type: resource is under lock\nFact type: lock belongs to transaction\nRule:      It is obligatory that each resource is under at most 1 lock that is exclusive';
        transactionModel = SBVRParser.matchAll(transactionModel, "expr");
        transactionModel = LF2AbstractSQLPrep.match(transactionModel, "Process");
        transactionModel = LF2AbstractSQL.match(transactionModel, "Process");
        return transactionModel = AbstractSQL2SQL(transactionModel);
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
        prepmod = LF2AbstractSQL.match(LF2AbstractSQLPrep.match(lfmod, "Process"), "Process");
        sqlmod = AbstractSQL2SQL(prepmod, "trans");
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
        var filts, fl, ft, ftree, isAttribute, jn, key, obj, result, row, row2, sql, sqlmod, table, tb, tree, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3, _ref4, _ref5;
        tree = req.tree;
        if (tree[1] === void 0) {
          result = {
            terms: [],
            factTypes: []
          };
          sqlmod = serverModelCache.getSQL();
          _ref = sqlmod.tables;
          for (key in _ref) {
            row = _ref[key];
            if (/Term,.*Verb,/.test(key)) {
              result.factTypes.push({
                id: row.name,
                name: row.name
              });
            } else {
              result.terms.push({
                id: row.name,
                name: row.name
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
          _ref2 = getCorrectTableInfo(tree[1][1]), table = _ref2.table, isAttribute = _ref2.isAttribute;
          if (tree[1][0] === "Term") {
            sql = 'SELECT * FROM "' + table.name + '"';
            if (ftree.length !== 1) sql += " WHERE ";
          } else if (tree[1][0] === "FactType") {
            ft = tree[1][1];
            if (isAttribute) {
              sql = 'SELECT id, _name AS "' + isAttribute.termName + '_name", "' + isAttribute.attributeName + '" FROM "' + table.name + '" WHERE "' + isAttribute.attributeName + '" = 1';
            } else {
              fl = ['"' + ft + '".id AS id'];
              jn = [];
              tb = ['"' + ft + '"'];
              _ref3 = tree[1][2].slice(1);
              for (_i = 0, _len = _ref3.length; _i < _len; _i++) {
                row = _ref3[_i];
                fl.push('"' + row + '".id AS "' + row + '_id"');
                fl.push('"' + row + '"."_name" AS "' + row + '_name"');
                tb.push('"' + row + '"');
                jn.push('"' + row + '".id = "' + ft + '"."' + row + '"');
              }
              sql = "SELECT " + fl.join(", ") + " FROM " + tb.join(", ") + " WHERE " + jn.join(" AND ");
            }
            if (ftree.length !== 1) sql += " AND ";
          }
          if (ftree.length !== 1) {
            filts = [];
            _ref4 = ftree.slice(1);
            for (_j = 0, _len2 = _ref4.length; _j < _len2; _j++) {
              row = _ref4[_j];
              if (row[0] === "filt") {
                _ref5 = row.slice(1);
                for (_k = 0, _len3 = _ref5.length; _k < _len3; _k++) {
                  row2 = _ref5[_k];
                  obj = "";
                  if (row2[1][0] != null) {
                    table = getCorrectTableInfo(row2[1]).table;
                    obj = '"' + table.name + '".';
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
                    var _ref6, _results;
                    _results = [];
                    for (i = 0, _ref6 = result.rows.length; 0 <= _ref6 ? i < _ref6 : i > _ref6; 0 <= _ref6 ? i++ : i--) {
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
        var binds, field, fields, i, id, isAttribute, pair, sql, table, tree, value, values, _ref, _ref2;
        if (req.tree[1] === void 0) {
          return res.send(404);
        } else {
          tree = req.tree;
          if (tree[1][1] === "transaction" && isExecute(tree)) {
            id = getID(tree);
            return db.transaction((function(tx) {
              return tx.executeSql('SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction" = ?;', [id], function(tx, locks) {
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
            _ref2 = getCorrectTableInfo(tree[1][1]), table = _ref2.table, isAttribute = _ref2.isAttribute;
            if (isAttribute) {
              sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 1 WHERE "' + table.idField + '" = ?;';
            } else {
              sql = 'INSERT INTO "' + table.name + '" ("' + fields.join('","') + '") VALUES (' + binds.join(",") + ');';
            }
            return db.transaction(function(tx) {
              tx.begin();
              return tx.executeSql(sql, values, function(tx, sqlResult) {
                return validateDB(tx, serverModelCache.getSQL(), function(tx, result) {
                  return res.json(result, {
                    location: "/data/" + tree[1][1] + "*filt:" + tree[1][1] + ".id=" + (isAttribute ? binds[0] : sqlResult.insertId)
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
              tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [id]);
              sql = 'INSERT INTO "conditional_representation"' + '("lock","field_name","field_type","field_value")' + "VALUES (?, ?, ?, ?)";
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
              return tx.executeSql('SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource" = ?) AS result;', [tree[1][1], id], function(tx, result) {
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
                tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [id]);
                tx.executeSql('INSERT INTO "conditional_representation" ("lock","field_name","field_type","field_value")' + "VALUES (?,'__DELETE','','')", [id]);
                return res.send(200);
              });
            } else {
              return db.transaction((function(tx) {
                return tx.executeSql('SELECT NOT EXISTS(SELECT * FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource" = ?) AS result;', [tree[1][1], id], function(tx, result) {
                  var isAttribute, sql, table, _ref, _ref2;
                  if ((_ref = result.rows.item(0).result) === 1 || _ref === true) {
                    tx.begin();
                    _ref2 = getCorrectTableInfo(tree[1][1]), table = _ref2.table, isAttribute = _ref2.isAttribute;
                    if (isAttribute) {
                      sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 0 WHERE "' + table.idField + '" = ?;';
                    } else {
                      sql = 'DELETE FROM "' + table.name + '" WHERE "' + table.idField + '" = ?;';
                    }
                    return tx.executeSql(sql, [id], function(tx, result) {
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
            var dropStatement, _i, _len, _ref, _results;
            _ref = sqlmod.dropSchema;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              dropStatement = _ref[_i];
              _results.push(tx.executeSql(dropStatement));
            }
            return _results;
          };
        })(serverModelCache.getSQL()));
        db.transaction((function(trnmod) {
          return function(tx) {
            var dropStatement, _i, _len, _ref, _results;
            _ref = trnmod.dropSchema;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              dropStatement = _ref[_i];
              _results.push(tx.executeSql(dropStatement));
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

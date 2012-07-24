(function() {
  var __hasProp = Object.prototype.hasOwnProperty;

  define(['sbvr-parser/SBVRParser', 'sbvr-compiler/LF2AbstractSQLPrep', 'sbvr-compiler/LF2AbstractSQL', 'sbvr-compiler/AbstractSQL2SQL', 'sbvr-compiler/AbstractSQLRules2SQL', 'data-server/ServerURIParser', 'underscore', 'utils/createAsyncQueueCallback'], function(SBVRParser, LF2AbstractSQLPrep, LF2AbstractSQL, AbstractSQL2SQL, AbstractSQLRules2SQL, ServerURIParser, _, createAsyncQueueCallback) {
    var db, endLock, executeSqlModel, exports, getCorrectTableInfo, getFTree, getID, op, parseURITree, rebuildFactType, runDelete, runGet, runPost, runPut, runURI, serverIsOnAir, serverModelCache, serverURIParser, sqlModels, transactionModel, uiModel, validateDB;
    exports = {};
    db = null;
    transactionModel = 'Term:      Integer\nTerm:      Long Text\nTerm:      resource type\n	Concept type: Long Text\nTerm:      field name\n	Concept type: Long Text\nTerm:      field value\n	Concept type: Long Text\nTerm:      field type\n	Concept type: Long Text\nTerm:      resource\nTerm:      transaction\nTerm:      lock\nTerm:      conditional representation\n	Database Value Field: lock\nFact type: lock is exclusive\nFact type: lock is shared\nFact type: resource is under lock\n	Term Form: locked resource\nFact type: locked resource has resource type\nFact type: lock belongs to transaction\nFact type: conditional representation has field name\nFact type: conditional representation has field value\nFact type: conditional representation has field type\nFact type: conditional representation has lock\nRule:      It is obligatory that each locked resource has exactly 1 resource type\nRule:      It is obligatory that each conditional representation has exactly 1 field name\nRule:      It is obligatory that each conditional representation has exactly 1 field value\nRule:      It is obligatory that each conditional representation has exactly 1 field type\nRule:      It is obligatory that each conditional representation has exactly 1 lock\nRule:      It is obligatory that each resource is under at most 1 lock that is exclusive';
    transactionModel = SBVRParser.matchAll(transactionModel, "expr");
    transactionModel = LF2AbstractSQLPrep.match(transactionModel, "Process");
    transactionModel = LF2AbstractSQL.match(transactionModel, "Process");
    uiModel = 'Term:      Short Text\nTerm:      Long Text\nTerm:      text\n	Concept type: Long Text\nTerm:      name\n	Concept type: Short Text\nTerm:      textarea\n	Database id Field: name\n	Database Value Field: text\nFact type: textarea is disabled\nFact type: textarea has name\nFact type: textarea has text\nRule:      It is obligatory that each textarea has exactly 1 name\nRule:      It is obligatory that each name is of exactly 1 textarea\nRule:      It is obligatory that each textarea has exactly 1 text';
    uiModel = SBVRParser.matchAll(uiModel, "expr");
    uiModel = LF2AbstractSQLPrep.match(uiModel, "Process");
    uiModel = LF2AbstractSQL.match(uiModel, "Process");
    serverURIParser = ServerURIParser.createInstance();
    serverURIParser.setSQLModel('transaction', transactionModel);
    serverURIParser.setSQLModel('ui', uiModel);
    sqlModels = [];
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
      if (factType.length === 1) return factType[0][1];
      return factType;
    };
    getCorrectTableInfo = function(termOrFactType) {
      var getAttributeInfo, sqlmod;
      getAttributeInfo = function(sqlmod) {
        var isAttribute, table;
        isAttribute = false;
        switch (sqlmod.tables[termOrFactType]) {
          case 'BooleanAttribute':
            isAttribute = {
              termName: termOrFactType[0][1],
              attributeName: termOrFactType[1][1]
            };
            table = sqlmod.tables[isAttribute.termName];
            break;
          case 'Attribute':
            isAttribute = {
              termName: termOrFactType[0][1],
              attributeName: sqlmod.tables[termOrFactType[2][1]].name
            };
            table = sqlmod.tables[isAttribute.termName];
            break;
          default:
            table = sqlmod.tables[termOrFactType];
        }
        return {
          table: table,
          isAttribute: isAttribute
        };
      };
      sqlmod = serverModelCache.getSQL();
      termOrFactType = rebuildFactType(termOrFactType);
      if (sqlmod.tables.hasOwnProperty(termOrFactType)) {
        return getAttributeInfo(sqlmod);
      } else if (transactionModel.tables.hasOwnProperty(termOrFactType)) {
        return getAttributeInfo(transactionModel);
      } else {
        console.error('Could not find table');
        return __DIE__.die();
      }
    };
    serverModelCache = function() {
      var pendingCallbacks, setValue, values;
      values = {
        serverOnAir: false,
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
          serverURIParser.setSQLModel('data', sqlmod);
          sqlModels['data'] = sqlmod;
          return setValue('sql', sqlmod);
        }
      };
      return db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE ' + '"_server_model_cache" (' + '"key"		VARCHAR(40) PRIMARY KEY,' + '"value"	VARCHAR(32768) );');
        return tx.executeSql('SELECT * FROM "_server_model_cache";', [], function(tx, result) {
          var callback, i, row, _i, _len, _ref, _results;
          for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
            row = result.rows.item(i);
            values[row.key] = JSON.parse(row.value);
            if (row.key === 'sql') {
              serverURIParser.setSQLModel('data', values[row.key]);
            }
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
      continueEndingLock = function(tx) {
        if (i < locks.rows.length - 1) {
          return endLock(tx, locks, i + 1, trans_id, successCallback, failureCallback);
        } else {
          return tx.executeSql('DELETE FROM "transaction" WHERE "id" = ?;', [trans_id], function(tx, result) {
            return validateDB(tx, serverModelCache.getSQL(), successCallback, failureCallback);
          }, function(tx, error) {
            return failureCallback(tx, [error]);
          });
        }
      };
      lock_id = locks.rows.item(i).lock;
      tx.executeSql('SELECT * FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], function(tx, crs) {
        return tx.executeSql('SELECT rl."resource_type", r."value" AS "resource_id" FROM "resource-is_under-lock" rl JOIN "resource" r ON rl."resource" = r."id" WHERE "lock" = ?;', [lock_id], function(tx, locked) {
          var asyncCallback, isAttribute, item, j, lockedRow, sql, table, _ref, _ref2;
          lockedRow = locked.rows.item(0);
          _ref = getCorrectTableInfo(lockedRow.resource_type), table = _ref.table, isAttribute = _ref.isAttribute;
          asyncCallback = createAsyncQueueCallback(function() {
            return continueEndingLock(tx);
          }, function(errors) {
            return failureCallback(tx, errors);
          });
          if (crs.rows.item(0).field_name === "__DELETE") {
            if (isAttribute) {
              sql = 'UPDATE "' + table.name + '" SET "' + isAttribute.attributeName + '" = 0 WHERE "' + table.idField + '" = ?;';
            } else {
              sql = 'DELETE FROM "' + table.name + '" WHERE "' + table.idField + '" = ?;';
            }
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
            sql += ' WHERE "' + table.idField + '" = ? ;';
          }
          asyncCallback.addWork(3);
          tx.executeSql(sql, [lockedRow.resource_id], asyncCallback.successCallback, asyncCallback.errorCallback);
          tx.executeSql('DELETE FROM "conditional_representation" WHERE "lock" = ?;', [lock_id], asyncCallback.successCallback, asyncCallback.errorCallback);
          tx.executeSql('DELETE FROM "resource-is_under-lock" WHERE "lock" = ?;', [lock_id], asyncCallback.successCallback, asyncCallback.errorCallback);
          return asyncCallback.endAdding();
        });
      });
      tx.executeSql('DELETE FROM "lock-belongs_to-transaction" WHERE "lock" = ?;', [lock_id]);
      return tx.executeSql('DELETE FROM "lock" WHERE "id" = ?;', [lock_id]);
    };
    validateDB = function(tx, sqlmod, successCallback, failureCallback) {
      var asyncCallback, rule, _i, _len, _ref;
      asyncCallback = createAsyncQueueCallback(function() {
        tx.end();
        return successCallback(tx);
      }, function(errors) {
        tx.rollback();
        return failureCallback(tx, errors);
      });
      asyncCallback.addWork(sqlmod.rules.length);
      _ref = sqlmod.rules;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rule = _ref[_i];
        tx.executeSql(rule.sql, [], (function(rule) {
          return function(tx, result) {
            var _ref2;
            if ((_ref2 = result.rows.item(0).result) === false || _ref2 === 0) {
              return asyncCallback.errorCallback(rule.structuredEnglish);
            } else {
              return asyncCallback.successCallback();
            }
          };
        })(rule));
      }
      return asyncCallback.endAdding();
    };
    executeSqlModel = function(tx, sqlModel, successCallback, failureCallback) {
      var createStatement, _i, _len, _ref;
      _ref = sqlModel.createSchema;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        createStatement = _ref[_i];
        tx.executeSql(createStatement);
      }
      return validateDB(tx, sqlModel, successCallback, failureCallback);
    };
    getFTree = function(tree) {
      var _ref;
      if ((_ref = tree[2][1][0]) === 'Term' || _ref === 'FactType') {
        return tree[2][2];
      }
      return [];
    };
    getID = function(tree) {
      var andClause, comparison, id, modifiers, whereClause, _i, _j, _len, _len2, _ref, _ref2;
      if (tree[1][0] === "Term") {
        id = tree[1][2];
      } else if (tree[1][0] === "FactType") {
        id = tree[1][3];
      }
      if (id === "") id = 0;
      if (id === 0) {
        modifiers = getFTree(tree);
        _ref = modifiers.slice(1);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          whereClause = _ref[_i];
          if (!(filters[0] === 'Where')) continue;
          andClause = whereClause[1];
          _ref2 = andClause.slice(1);
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            comparison = _ref2[_j];
            if (comparison[0] === "Equals" && comparison[1][1] === "id") {
              return comparison[2][1];
            }
          }
        }
      }
      return id;
    };
    runURI = function(method, uri, body, successCallback, failureCallback) {
      var req, res;
      if (body == null) body = {};
      console.log('Running URI', method, uri, body);
      req = {
        tree: serverURIParser.match([method, uri], 'Process'),
        body: body
      };
      res = {
        send: function(statusCode) {
          if (statusCode === 404) {
            return typeof failureCallback === "function" ? failureCallback() : void 0;
          } else {
            return typeof successCallback === "function" ? successCallback() : void 0;
          }
        },
        json: function(data) {
          return typeof successCallback === "function" ? successCallback(data) : void 0;
        }
      };
      switch (method) {
        case 'GET':
          return runGet(req, res);
        case 'POST':
          return runPost(req, res);
        case 'PUT':
          return runPut(req, res);
        case 'DELETE':
          return runDelete(req, res);
      }
    };
    runGet = function(req, res) {
      var field, sql, tree, values, _i, _len, _ref;
      tree = req.tree;
      if (tree[2] === void 0) {
        return res.send(404);
      } else {
        console.log(tree[2]);
        sql = AbstractSQLRules2SQL.match(tree[2], 'Query');
        values = [];
        _ref = tree[3];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          field = _ref[_i];
          values.push(req.body[0][field]);
        }
        console.log(sql, values);
        return db.transaction(function(tx) {
          return tx.executeSql(sql, values, function(tx, result) {
            var data, i;
            if (result.rows.length === 0) {
              return res.send(404);
            } else {
              data = {
                instances: (function() {
                  var _ref2, _results;
                  _results = [];
                  for (i = 0, _ref2 = result.rows.length; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
                    _results.push(result.rows.item(i));
                  }
                  return _results;
                })()
              };
              return res.json(data);
            }
          }, function() {
            return res.send(404);
          });
        });
      }
    };
    runPost = function(req, res) {
      var field, sql, tree, values, vocab, _i, _len, _ref;
      tree = req.tree;
      if (tree[2] === void 0) {
        return res.send(404);
      } else {
        console.log(tree[2]);
        sql = AbstractSQLRules2SQL.match(tree[2], 'Query');
        values = [];
        _ref = tree[3];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          field = _ref[_i];
          values.push(req.body[0][field]);
        }
        console.log(sql, values);
        vocab = tree[1][1];
        return db.transaction(function(tx) {
          tx.begin();
          return tx.executeSql(sql, values, function(tx, sqlResult) {
            return validateDB(tx, sqlModels[vocab], function(tx) {
              var insertID;
              tx.end();
              insertID = tree[2][0] === 'UpdateQuery' ? values[0] : sqlResult.insertId;
              console.log('Insert ID: ', insertID);
              return res.send(201, {
                location: '/' + vocab + '/' + tree[2][2][1] + "*filt:" + tree[2][2][1] + ".id=" + insertID
              });
            }, function() {
              return res.send(404);
            });
          }, function() {
            return res.send(404);
          });
        });
      }
    };
    runPut = function(req, res) {
      var doValidate, field, id, insertSQL, sql, tree, updateSQL, values, vocab, _i, _len, _ref;
      tree = req.tree;
      if (tree[1] === void 0) {
        return res.send(404);
      } else {
        console.log(tree[2]);
        sql = AbstractSQLRules2SQL.match(tree[2], 'Query');
        values = [];
        _ref = tree[3];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          field = _ref[_i];
          values.push(req.body[0][field]);
        }
        console.log(sql, values);
        vocab = tree[1][1];
        insertSQL = sql;
        if (_.isArray(sql)) {
          insertSQL = sql[0];
          updateSQL = sql[1];
        }
        doValidate = function(tx) {
          return validateDB(tx, sqlModels[vocab], function(tx) {
            tx.end();
            return res.send(200);
          }, function(tx, errors) {
            return res.json(errors, 404);
          });
        };
        id = getID(tree);
        return db.transaction(function(tx) {
          tx.begin();
          return db.transaction(function(tx) {
            return tx.executeSql('SELECT NOT EXISTS(SELECT 1 FROM "resource-is_under-lock" AS r WHERE r."resource_type" = ? AND r."resource" = ?) AS result;', [tree[2][2][1], id], function(tx, result) {
              var _ref2;
              if ((_ref2 = result.rows.item(0).result) === 0 || _ref2 === false) {
                return res.json(["The resource is locked and cannot be edited"], 404);
              } else {
                return tx.executeSql(insertSQL, values, function(tx, result) {
                  return doValidate(tx);
                }, function(tx) {
                  if (updateSQL != null) {
                    return tx.executeSql(updateSQL, values, function(tx, result) {
                      return doValidate(tx);
                    }, function() {
                      return res.send(404);
                    });
                  } else {
                    return res.send(404);
                  }
                });
              }
            });
          });
        });
      }
    };
    runDelete = function(req, res) {
      var field, sql, tree, values, vocab, _i, _len, _ref;
      tree = req.tree;
      if (tree[1] === void 0) {
        return res.send(404);
      } else {
        console.log(tree[2]);
        sql = AbstractSQLRules2SQL.match(tree[2], 'Query');
        values = [];
        _ref = tree[3];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          field = _ref[_i];
          values.push(req.body[0][field]);
        }
        console.log(sql, values);
        vocab = tree[1][1];
        return db.transaction(function(tx) {
          tx.begin();
          return tx.executeSql(sql, values, function(tx, result) {
            return validateDB(tx, sqlModels[vocab], function(tx) {
              tx.end();
              return res.send(200);
            }, function(tx, errors) {
              return res.json(errors, 404);
            });
          }, function() {
            return res.send(404);
          });
        });
      }
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
          req.tree = serverURIParser.match([req.method, req.url], 'Process');
          console.log(req.url, req.tree, req.body);
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
        transactionModel = AbstractSQL2SQL(transactionModel);
        uiModel = AbstractSQL2SQL(uiModel);
        sqlModels['transaction'] = transactionModel;
        sqlModels['ui'] = uiModel;
        return db.transaction(function(tx) {
          executeSqlModel(tx, uiModel, function() {
            return console.log('Sucessfully executed ui model.');
          }, function(tx, error) {
            return console.log('Failed to execute ui model.', error);
          });
          return executeSqlModel(tx, transactionModel, function() {
            return console.log('Sucessfully executed transaction model.');
          }, function(tx, error) {
            return console.log('Failed to execute transaction model.', error);
          });
        });
      });
      app.get('/onair', function(req, res, next) {
        return serverModelCache.whenLoaded(function() {
          return res.json(serverModelCache.isServerOnAir());
        });
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
        return runURI('GET', '/ui/textarea*filt:name=model_area', null, function(result) {
          var lfmod, prepmod, se, sqlmod;
          se = result.instances[0].text;
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
            return executeSqlModel(tx, sqlmod, function(tx) {
              runURI('PUT', '/ui/textarea-is_disabled*filt:textarea.name=model_area/', [
                {
                  value: true
                }
              ]);
              serverModelCache.setServerOnAir(true);
              serverModelCache.setLastSE(se);
              serverModelCache.setLF(lfmod);
              serverModelCache.setPrepLF(prepmod);
              serverModelCache.setSQL(sqlmod);
              return res.send(200);
            }, function(tx, errors) {
              return res.json(errors, 404);
            });
          });
        }, function() {
          return res.send(404);
        });
      });
      app.del('/cleardb', function(req, res, next) {
        return db.transaction(function(tx) {
          return tx.tableList(function(tx, result) {
            var i, _ref;
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tx.dropTable(result.rows.item(i).name);
            }
            executeSqlModel(tx, uiModel, function() {
              return console.log('Sucessfully executed ui model.');
            }, function(tx, error) {
              return console.log('Failed to execute ui model.', error);
            });
            executeSqlModel(tx, transactionModel, function() {
              return console.log('Sucessfully executed transaction model.');
            }, function(tx, error) {
              return console.log('Failed to execute transaction model.', error);
            });
            return res.send(200);
          });
        });
      });
      app.put('/importdb', function(req, res, next) {
        var asyncCallback, queries;
        queries = req.body.split(";");
        asyncCallback = createAsyncQueueCallback(function() {
          return res.send(200);
        }, function() {
          return res.send(404);
        });
        return db.transaction(function(tx) {
          var query, _i, _len;
          for (_i = 0, _len = queries.length; _i < _len; _i++) {
            query = queries[_i];
            if (query.trim().length > 0) {
              (function(query) {
                asyncCallback.addWork();
                return tx.executeSql(query, [], asyncCallback.successCallback, function(tx, error) {
                  console.log(query);
                  console.log(error);
                  return asyncCallback.errorCallback;
                });
              })(query);
            }
          }
          return asyncCallback.endAdding();
        });
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
              var asyncCallback, exported, i, tbn, _fn, _ref;
              exported = '';
              asyncCallback = createAsyncQueueCallback(function() {
                return res.json(exported);
              }, function() {
                return res.send(404);
              });
              asyncCallback.addWork(result.rows.length);
              _fn = function(tbn) {
                return db.transaction(function(tx) {
                  return tx.executeSql('SELECT * FROM "' + tbn + '";', [], function(tx, result) {
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
                    return asyncCallback.successCallback();
                  }, asyncCallback.errorCallback);
                });
              };
              for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
                tbn = result.rows.item(i).name;
                exported += 'DROP TABLE IF EXISTS "' + tbn + '";\n';
                exported += result.rows.item(i).sql + ";\n";
                _fn(tbn);
              }
              return asyncCallback.endAdding();
            }, null, "name NOT LIKE '%_buk'");
          });
        }
      });
      app.post('/backupdb', serverIsOnAir, function(req, res, next) {
        return db.transaction(function(tx) {
          return tx.tableList(function(tx, result) {
            var asyncCallback, i, tbn, _ref, _results;
            asyncCallback = createAsyncQueueCallback(function() {
              return res.send(200);
            }, function() {
              return res.send(404);
            });
            asyncCallback.addWork(result.rows.length * 2);
            _results = [];
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tbn = result.rows.item(i).name;
              tx.dropTable(tbn + '_buk', true, asyncCallback.successCallback, asyncCallback.errorCallback);
              _results.push(tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn + '_buk";', asyncCallback.successCallback, asyncCallback.errorCallback));
            }
            return _results;
          }, function() {
            return res.send(404);
          }, "name NOT LIKE '%_buk'");
        });
      });
      app.post('/restoredb', serverIsOnAir, function(req, res, next) {
        return db.transaction(function(tx) {
          return tx.tableList(function(tx, result) {
            var asyncCallback, i, tbn, _ref, _results;
            asyncCallback = createAsyncQueueCallback(function() {
              return res.send(200);
            }, function() {
              return res.send(404);
            });
            asyncCallback.addWork(result.rows.length * 2);
            _results = [];
            for (i = 0, _ref = result.rows.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
              tbn = result.rows.item(i).name;
              tx.dropTable(tbn.slice(0, -4), true, asyncCallback.successCallback, asyncCallback.errorCallback);
              _results.push(tx.executeSql('ALTER TABLE "' + tbn + '" RENAME TO "' + tbn.slice(0, -4) + '";', asyncCallback.successCallback, asyncCallback.errorCallback));
            }
            return _results;
          }, function() {
            return res.send(404);
          }, "name LIKE '%_buk'");
        });
      });
      app.post('/transaction/execute/*', serverIsOnAir, function(req, res, next) {
        var id;
        id = req.url.split('/');
        id = id[id.length - 1];
        return db.transaction((function(tx) {
          return tx.executeSql('SELECT * FROM "lock-belongs_to-transaction" WHERE "transaction" = ?;', [id], function(tx, locks) {
            return endLock(tx, locks, 0, id, function(tx) {
              return res.send(200);
            }, function(tx, errors) {
              return res.json(errors, 404);
            });
          });
        }));
      });
      app.get('/ui/*', parseURITree, function(req, res, next) {
        return runGet(req, res);
      });
      app.get('/transaction/*', serverIsOnAir, parseURITree, function(req, res, next) {
        var field, sql, tree, values, _i, _len, _ref;
        tree = req.tree;
        if (tree[2] === void 0) {
          return __TODO__.die();
        } else {
          if (tree[2][2][1] === 'transaction') {
            console.log(tree[2]);
            sql = AbstractSQLRules2SQL.match(tree[2], 'Query');
            values = [];
            _ref = tree[3];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              field = _ref[_i];
              values.push(req.body[0][field]);
            }
            console.log(sql, values);
            return db.transaction(function(tx) {
              return tx.executeSql(sql, values, function(tx, result) {
                if (result.rows.length > 1) __TODO__.die();
                return res.json({
                  id: result.rows.item(0).id,
                  tcURI: "/transaction",
                  lcURI: "/transaction/lock",
                  tlcURI: "/transaction/lock-belongs_to-transaction",
                  rcURI: "/transaction/resource",
                  lrcURI: "/transaction/resource-is_under-lock",
                  slcURI: "/transaction/lock-is_shared",
                  xlcURI: "/transaction/lock-is_exclusive",
                  ctURI: "/transaction/execute/" + result.rows.item(0).id
                });
              }, function() {
                return res.send(404);
              });
            });
          } else {
            return runGet(req, res);
          }
        }
      });
      app.get('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        var key, result, row, sqlmod, tree, _ref;
        tree = req.tree;
        if (tree[2] === void 0) {
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
        } else {
          return runGet(req, res);
        }
      });
      app.post('/transaction/*', serverIsOnAir, parseURITree, function(req, res, next) {
        return runPost(req, res);
      });
      app.post('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        return runPost(req, res);
      });
      app.put('/ui/*', parseURITree, function(req, res, next) {
        return runPut(req, res);
      });
      app.put('/transaction/*', serverIsOnAir, parseURITree, function(req, res, next) {
        return runPut(req, res);
      });
      app.put('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        return runPut(req, res);
      });
      app.del('/transaction/*', serverIsOnAir, parseURITree, function(req, res, next) {
        return runDelete(req, res);
      });
      app.del('/data/*', serverIsOnAir, parseURITree, function(req, res, next) {
        return runDelete(req, res);
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
        runURI('DELETE', '/ui/textarea-is_disabled*filt:textarea.name=model_area/');
        runURI('PUT', '/ui/textarea*filt:name=model_area/', [
          {
            text: ''
          }
        ]);
        serverModelCache.setLastSE("");
        serverModelCache.setPrepLF([]);
        serverModelCache.setLF([]);
        serverModelCache.setSQL([]);
        serverModelCache.setServerOnAir(false);
        return res.send(200);
      });
    };
    return exports;
  });

}).call(this);

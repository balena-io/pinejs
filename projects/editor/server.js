(function() {
  var db, decodeBase, handleGet, handlePost, http, requirejs, staticServer, toBase;

  db = null;

  if (typeof process !== "undefined" && process !== null) {
    requirejs = require('requirejs');
    requirejs.config({
      nodeRequire: require,
      baseUrl: 'js'
    });
  } else {
    requirejs = window.requirejs;
  }

  requirejs(["libs/inflection", "../ometa-js/lib", "../ometa-js/ometa-base"]);

  requirejs(["mylibs/ometa-code/SBVRModels", "mylibs/ometa-code/SBVRParser", "mylibs/ometa-code/SBVR_PreProc", "mylibs/ometa-code/SBVR2SQL", "mylibs/ometa-code/ServerURIParser"]);

  requirejs(['mylibs/db'], function(dbModule) {
    if (typeof process !== "undefined" && process !== null) {
      db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres");
    } else {
      db = dbModule.websql('rulemotion');
    }
    return db.transaction(function(tx) {
      return tx.tableList(function(tx, result) {
        if (result.rows.length === 0) {
          return tx.executeSql('CREATE TABLE ' + '"_sbvr_editor_cache" (' + '"id" INTEGER PRIMARY KEY AUTOINCREMENT,' + '"value" VARCHAR );');
        }
      }, null, "name = '_sbvr_editor_cache'");
    });
  });

  toBase = function(decimal, base) {
    var chars, symbols;
    symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    chars = "";
    if (base > symbols.length || base <= 1) return false;
    while (decimal >= 1) {
      chars = symbols[decimal - (base * Math.floor(decimal / base))] + chars;
      decimal = Math.floor(decimal / base);
    }
    return chars;
  };

  decodeBase = function(url, base) {
    var alphaChar, alphaNum, sum, symbols, _i, _len, _ref;
    symbols = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    sum = 0;
    _ref = url.split("");
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      alphaChar = _ref[_i];
      alphaNum = alphaChar.charCodeAt(0);
      if (48 <= alphaNum && alphaNum <= 57) {
        alphaNum -= 48;
      } else if (65 <= alphaNum && alphaNum <= 90) {
        alphaNum -= 29;
      } else if (97 <= alphaNum && alphaNum <= 122) {
        alphaNum -= 87;
      } else {
        return false;
      }
      sum *= base;
      sum += alphaNum;
    }
    return sum;
  };

  staticServer = new (require('node-static').Server)('./');

  http = require('http');

  http.createServer(function(request, response) {
    var body;
    body = '';
    request.on('data', function(chunk) {
      return body += chunk;
    });
    return request.on('end', function() {
      var nodePath;
      console.log('End', request.method, request.url);
      nodePath = '/node';
      if (nodePath === request.url.slice(0, nodePath.length)) {
        response.writeHead(200, {
          "content-type": "text/plain"
        });
        switch (request.method) {
          case "POST":
            return handlePost(request, response, body);
          case "GET":
            return handleGet(request, response);
          default:
            return response.end();
        }
      } else {
        console.log('Static');
        return staticServer.serve(request, response);
      }
    });
  }).listen(process.env.PORT || 1337, function() {
    return console.log('Server started');
  });

  handlePost = function(request, response, body) {
    return db.transaction(function(tx) {
      var lfmod, value;
      try {
        lfmod = SBVRParser.matchAll(body, "expr");
      } catch (e) {
        console.log('Error parsing model', e);
        response.end(JSON.stringify('Error parsing model'));
        return null;
      }
      value = JSON.stringify(body);
      return tx.executeSql('INSERT INTO "_sbvr_editor_cache" ("value") VALUES (?);', [value], function(tx, result) {
        return response.end(JSON.stringify(toBase(result.insertId, 62)));
      }, function(tx, error) {
        return response.end(JSON.stringify(error));
      });
    });
  };

  handleGet = function(request, response) {
    var key;
    key = decodeBase(request.url.slice('/node'.length + 1), 62);
    if (key !== false) {
      console.log('key: ', key);
      return db.transaction(function(tx) {
        return tx.executeSql('SELECT * FROM "_sbvr_editor_cache" WHERE id = ?;', [key], function(tx, result) {
          if (result.rows.length === 0) {
            return response.end(JSON.stringify("Error"));
          } else {
            return response.end(result.rows.item(0).value);
          }
        }, function(tx, error) {
          return response.end(JSON.stringify(error));
        });
      });
    }
  };

}).call(this);

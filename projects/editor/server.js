(function() {
  var db, http, requirejs, staticServer;
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
  requirejs(["../ometa-js/lib", "../ometa-js/ometa-base"]);
  requirejs(['mylibs/db'], function(dbModule) {
    if (typeof process !== "undefined" && process !== null) {
      db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres");
    } else {
      db = dbModule.websql('rulemotion');
    }
    return db.transaction(function(tx) {
      return tx.tableList((function(tx, result) {
        if (result.rows.length === 0) {
          return tx.executeSql('CREATE TABLE ' + '"_sbvr_editor_cache" (' + '"key"	VARCHAR PRIMARY KEY,' + '"value"	VARCHAR );');
        }
      }, null, "name = '_sbvr_editor_cache'"));
    });
  });
  staticServer = new (require('node-static').Server)('./');
  http = require('http');
  http.createServer(function(request, response) {
    var body;
    body = '';
    request.on('data', function(chunk) {
      return body += chunk;
    });
    return request.on('end', function() {
      var key, nodePath;
      console.log('End', request.method, request.url);
      nodePath = '/node/file';
      if (nodePath === request.url.slice(0, nodePath.length)) {
        key = "file";
        response.writeHead(200, "");
        if (request.method === "POST") {
          db.transaction(function(tx) {
            var value;
            value = JSON.stringify(body);
            return tx.executeSql('SELECT 1 FROM "_sbvr_editor_cache" WHERE key = ?;', [key], function(tx, result) {
              if (result.rows.length === 0) {
                return tx.executeSql('INSERT INTO "_sbvr_editor_cache" VALUES (?, ?);', [key, value], null, null, false);
              } else {
                return tx.executeSql('UPDATE "_sbvr_editor_cache" SET value = ? WHERE key = ?;', [value, key]);
              }
            });
          });
          return response.end(JSON.stringify(""));
        } else if (request.method === "GET") {
          return db.transaction(function(tx) {
            return tx.executeSql('SELECT * FROM "_sbvr_editor_cache" WHERE key = ?;', [key], function(tx, result) {
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
      } else {
        console.log('Static');
        return staticServer.serve(request, response);
      }
    });
  }).listen(process.env.PORT || 1337, function() {
    return console.log('Server started');
  });
}).call(this);

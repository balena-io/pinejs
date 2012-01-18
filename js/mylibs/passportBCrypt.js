
  define(function(requirejs, exports, module) {
    var LocalStrategy, bcrypt;
    bcrypt = require('bcrypt');
    LocalStrategy = require('passport-local').Strategy;
    exports.init = function(passport, db) {
      passport.serializeUser(function(user, done) {
        return done(null, user);
      });
      passport.deserializeUser(function(user, done) {
        return done(null, user);
      });
      return passport.use(new LocalStrategy(function(username, password, done) {
        return db.transaction(function(tx) {
          return tx.executeSql('SELECT password FROM users WHERE username = ?', [username], function(tx, result) {
            if (result.rows.length !== 0 && (password = bcrypt.compare_sync(password, result.rows.item(i).password))) {
              return done(null, username);
            } else {
              return done(null, false);
            }
          }, function(tx, err) {
            return done(null, false);
          });
        });
      }));
    };
    return exports;
  });

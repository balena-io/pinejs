
  /*
  To generate a hashed password we can use this line:
  password = bcrypt.encrypt_sync(password, bcrypt.gen_salt_sync())
  
  CREATE TABLE users (
  	username VARCHAR(50) NOT NULL PRIMARY KEY,
  	password CHAR(60) NOT NULL
  );
  */

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
            if (result.rows.length !== 0 && bcrypt.compare_sync(password, result.rows.item(0).password)) {
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
    exports.isAuthed = function(req, res, next) {
      if (req.isAuthenticated()) {
        return next();
      } else {
        return res.redirect('/login.html');
      }
    };
    return exports;
  });

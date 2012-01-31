(function() {
  var app, db, express, passport, requirejs, setupCallback;

  setupCallback = function(requirejs, app) {
    requirejs(['mylibs/SBVRServer'], function(sbvrServer) {
      return sbvrServer.setup(app, requirejs);
    });
    requirejs(['mylibs/editorServer'], function(editorServer) {
      return editorServer.setup(app, requirejs);
    });
    if (typeof process !== "undefined" && process !== null) {
      return app.listen(process.env.PORT || 1337, function() {
        return console.log('Server started');
      });
    }
  };

  if (typeof process !== "undefined" && process !== null) {
    requirejs = require('requirejs');
    requirejs.config({
      nodeRequire: require,
      baseUrl: 'js'
    });
    express = require('express');
    app = express.createServer();
    passport = require('passport');
    app.configure(function() {
      app.use(express.cookieParser());
      app.use(express.bodyParser());
      app.use(express.session({
        secret: "A pink cat jumped over a rainbow"
      }));
      app.use(passport.initialize());
      app.use(passport.session());
      return app.use(express.static(process.cwd()));
    });
    db = null;
    requirejs(['mylibs/db'], function(dbModule) {
      db = dbModule.postgres(process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres");
      return requirejs('mylibs/passportBCrypt').init(passport, db);
    });
    app.post('/login', passport.authenticate('local', {
      failureRedirect: '/login.html'
    }), function(req, res, next) {
      return res.redirect('/');
    });
    setupCallback(requirejs, app);
  } else {
    requirejs = window.requirejs;
    requirejs(['express-emulator'], function(express) {
      if (typeof window !== "undefined" && window !== null) {
        window.remoteServerRequest = app.process;
      }
      return setupCallback(requirejs, express.app);
    });
  }

}).call(this);

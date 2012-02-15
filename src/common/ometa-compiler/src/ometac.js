(function() {
  var compileOmeta, compileOmetaFile, console, filePath, fs, load, ometaPath, parsingError, pretty, translationError, vm, _i, _len;

  console = require("console");

  fs = require("fs");

  vm = require("vm");

  load = function(filePath) {
    return vm.runInThisContext(fs.readFileSync(filePath, "utf8"), __filename);
  };

  load(__dirname + "/../../../external/ometa-js/lib.js");

  load(__dirname + "/../../../external/ometa-js/ometa-base.js");

  load(__dirname + "/../../../external/ometa-js/parser.js");

  load(__dirname + "/../../../external/ometa-js/bs-js-compiler.js");

  load(__dirname + "/../../../external/ometa-js/bs-ometa-compiler.js");

  load(__dirname + "/../../../external/ometa-js/bs-ometa-optimizer.js");

  load(__dirname + "/../../../external/ometa-js/bs-ometa-js-compiler.js");

  load(__dirname + "/../../../external/beautify/beautify.js");

  translationError = function(m, i) {
    console.log("Translation error - please tell Alex about this!");
    throw fail;
  };

  parsingError = function(ometa) {
    return function(m, i) {
      var start;
      start = Math.max(0, i - 20);
      console.log("Error around: " + ometa.substring(start, Math.min(ometa.length, start + 40)));
      console.log("Error around: " + ometa.substring(i - 2, Math.min(ometa.length, i + 2)));
      throw m;
    };
  };

  compileOmeta = function(ometa, pretty, desc) {
    var js, tree;
    if (desc == null) desc = 'OMeta';
    console.log("Parsing: " + desc);
    tree = BSOMetaJSParser.matchAll(ometa, "topLevel", void 0, parsingError(ometa));
    console.log("Compiling: " + desc);
    js = BSOMetaJSTranslator.match(tree, "trans", void 0, translationError);
    if (pretty === true) {
      console.log("Beautifying: " + desc);
      js = js_beautify(js);
    }
    return js;
  };

  compileOmetaFile = function(ometaFilePath, jsFilePath, pretty) {
    console.log("Reading: " + ometaFilePath);
    return fs.readFile(ometaFilePath, "utf8", (function(ometaFilePath) {
      return function(err, data) {
        var js, ometa;
        if (err) {
          return console.log(err);
        } else {
          ometa = data.replace(/\r\n/g, "\n");
          js = compileOmeta(ometa, pretty, ometaFilePath);
          console.log("Writing: " + ometaFilePath);
          return fs.writeFile(jsFilePath, js);
        }
      };
    })(ometaFilePath));
  };

  if (process.argv[1] === __filename) {
    arguments = process.argv.slice(2);
    ometaPath = arguments[0];
    pretty = arguments[0] === "pretty";
    if (pretty === true) arguments.shift();
    for (_i = 0, _len = arguments.length; _i < _len; _i++) {
      filePath = arguments[_i];
      compileOmetaFile(filePath, filePath.substring(0, filePath.lastIndexOf(".")) + ".js", pretty);
    }
  }

  if (typeof exports !== "undefined" && exports !== null) {
    exports.compileOmetaFile = compileOmetaFile;
  }

  if (typeof exports !== "undefined" && exports !== null) {
    exports.compileOmeta = compileOmeta;
  }

}).call(this);

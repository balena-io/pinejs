(function() {
  var compileOmeta, console, filePath, fs, load, ometaPath, parsingError, pretty, translationError, vm, _i, _len;
  console = require("console");
  fs = require("fs");
  vm = require("vm");
  load = function(filePath) {
    return vm.runInThisContext(fs.readFileSync(filePath, "utf8"), __filename);
  };
  load(__dirname + "/../../ometa-js/lib.js");
  load(__dirname + "/../../ometa-js/ometa-base.js");
  load(__dirname + "/../../ometa-js/parser.js");
  load(__dirname + "/../../ometa-js/bs-js-compiler.js");
  load(__dirname + "/../../ometa-js/bs-ometa-compiler.js");
  load(__dirname + "/../../ometa-js/bs-ometa-optimizer.js");
  load(__dirname + "/../../ometa-js/bs-ometa-js-compiler.js");
  load(__dirname + "/../../ometa-dev/js/beautify.js");
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
  compileOmeta = function(ometaFilePath, jsFilePath, pretty) {
    console.log("Reading: " + ometaFilePath);
    return fs.readFile(ometaFilePath, "utf8", (function(ometaFilePath) {
      return function(err, data) {
        var js, ometa, tree;
        if (err) {
          return console.log(err);
        } else {
          ometa = data.replace(/\r\n/g, "\n");
          console.log("Parsing: " + ometaFilePath);
          tree = BSOMetaJSParser.matchAll(ometa, "topLevel", void 0, parsingError(ometa));
          console.log("Compiling: " + ometaFilePath);
          js = BSOMetaJSTranslator.match(tree, "trans", void 0, translationError);
          if (pretty === true) {
            console.log("Beautifying: " + ometaFilePath);
            js = js_beautify(js);
          }
          console.log("Writing: " + ometaFilePath);
          return fs.writeFile(jsFilePath, js);
        }
      };
    })(ometaFilePath));
  };
  if (process.argv[1] === __filename) {
    arguments = process.argv.slice(2);
    ometaPath = arguments[0];
    if ((pretty = arguments[0] === "pretty") === true) {
      arguments.shift();
    }
    for (_i = 0, _len = arguments.length; _i < _len; _i++) {
      filePath = arguments[_i];
      compileOmeta(filePath, filePath.substring(0, filePath.lastIndexOf(".")) + ".js", pretty);
    }
  }
  if (typeof exports !== "undefined" && exports !== null) {
    exports.compileOmeta = compileOmeta;
  }
}).call(this);

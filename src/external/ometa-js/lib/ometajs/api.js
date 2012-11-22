var ometajs = require('../ometajs'),
    uglify = require('uglify-js'),
    vm = require('vm'),
    Module = require('module'),
    clone = function clone(obj) {
      var o = {};

      Object.keys(obj).forEach(function(key) {
        o[key] = obj[key];
      });

      return o;
    },
    getLineAndColumn = function(string, index) {
      var char,
          column = 0,
          line = 1,
          i = 0,
          len;
      string = string.slice(0, index + 1);
      for (len = string.length; i < len; i++) {
        column++;
        if (string[i] == '\n') {
          line++;
          column = 0;
        }
      }
      return {line: line, column: column, index: index};
    };

//
// ### function compilationError(m, i)
// #### @m {Number}
// #### @i {Number}
//
function compilationError(code) {
  return function(m, i, fail) {
    var lineCol = getLineAndColumn(code, i);
    throw fail._extend(lineCol);
  };
};

//
// ### function translationError(m, i)
// #### @m {Number}
// #### @i {Number}
//
function translationError(m, i, fail) {
  throw fail;
};

//
// ### function wrapModule(module)
// #### @code {String} javascript code to wrap
// Wrap javascript code in ometajs.core context
//
function wrapModule(code, options) {
  var requirePath = (options.root || ometajs.root || 'ometa-core'),
      start =
        "(function (root, factory) {\
          if (typeof exports === 'object') {\
            /* CommonJS */\
            factory(exports, require('" + requirePath + "'));\
          } else if (typeof define === 'function' && define.amd) {\
            /* AMD. Register as an anonymous module. */\
            define(['exports', 'ometa-core'], factory);
          } else {\
            /* Browser globals - dangerous */\
            factory(root, root.OMeta);\
          }\
        }(this, function (exports, OMeta) {",
      end = "}));"

  return start + code + end;
};

//
// ### function translateCode(code)
// #### @code {String} source code
// Translates .ometajs code into javascript
//
function translateCode(code, options) {
  options || (options = {});
  var tree = ometajs.BSOMetaJSParser.matchAll(code, "topLevel", undefined,
                                              compilationError(code));

  code = ometajs.BSOMetaJSTranslator.match(tree, "trans", undefined,
                                           translationError);

  // Beautify code
  code = uglify.uglify.gen_code(uglify.parser.parse(code), { beautify: true });

  if (options.noContext) return code;

  return wrapModule(code, options);
};
exports.translateCode = translateCode;

//
// ### function evalCode(code, filename)
// #### @code {String} source code
// #### @filename {String} filename for stack traces
// Translates and evaluates ometajs code
//
function evalCode(code, filename, options) {
  options || (options = {});
  options.noContext = true;

  code = translateCode(code, options);
  return vm.runInNewContext('var exports = {};' + code + '\n;exports',
                            clone(ometajs.core),
                            filename || 'ometa');
};
exports.evalCode = evalCode;

// Allow users to `require(...)` ometa files
require.extensions['.ometajs'] = require.extensions['.ojs'] = require.extensions['.ometa'] = function(module, filename) {
  var code = translateCode(require('fs').readFileSync(filename).toString());

  module._compile(code, filename);
};

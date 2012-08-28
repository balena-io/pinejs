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
    };

//
// ### function compilationError(m, i)
// #### @m {Number}
// #### @i {Number}
//
function compilationError(m, i, fail) {
  throw fail.extend({errorPos: i});
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
  var req = 'require(\'' + (options.root || ometajs.root || 'core') + '\')',
      buf = [
        'var OMeta;',
        'if(typeof window !== "undefined") {',
          'OMeta = window.OMeta;',
        '} else {',
          'OMeta = ', req, '.OMeta;',
        '}',
        'if(typeof exports === "undefined") {',
          'exports = {};',
        '}'
      ];

  buf.push(code);

  return buf.join('');
};

//
// ### function translateCode(code)
// #### @code {String} source code
// Translates .ometajs code into javascript
//
function translateCode(code, options) {
  options || (options = {});
  var tree = ometajs.BSOMetaJSParser.matchAll(code, "topLevel", undefined,
                                              compilationError);

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
require.extensions['.ometajs'] = function(module, filename) {
  var code = translateCode(require('fs').readFileSync(filename).toString());

  module._compile(code, filename);
};

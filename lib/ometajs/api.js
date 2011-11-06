var ometajs = require('../ometajs'),
    utils = ometajs.utils,
    vm = require('vm'),
    Module = require('module'),
    fail = ometajs.globals.fail;
    objectThatDelegatesTo = ometajs.globals.objectThatDelegatesTo;

//
// ### function compilationError(m, i)
// #### @m {Number}
// #### @i {Number}
//
function compilationError(m, i) {
  throw objectThatDelegatesTo(fail, {errorPos: i});
};

//
// ### function translationError(m, i)
// #### @m {Number}
// #### @i {Number}
//
function translationError(m, i) {
  throw fail;
};

//
// ### function wrapModule(module)
// #### @code {String} javascript code to wrap
// Wrap javascript code in ometajs.globals context
//
function wrapModule(code) {
  var buf = ['var ometajs_ = require(\'ometajs\').globals;'];

  Object.keys(ometajs.globals).forEach(function(key) {
    buf.push('var ', key, ' = ometajs_.', key, ';\n');
  });
  buf.push(code);

  return buf.join('');
};

//
// ### function translateCode(code)
// #### @code {String} source code
// Translates .ometajs code into javascript
//
function translateCode(code) {
  var tree;

  tree = ometajs.BSOMetaJSParser.matchAll(code, "topLevel", undefined,
                                  compilationError);

  code = ometajs.BSOMetaJSTranslator.match(tree, "trans", undefined,
                                           translationError);

  return wrapModule(code);
};
exports.translateCode = translateCode;

//
// ### function evalCode(code, filename)
// #### @code {String} source code
// #### @filename {String} filename for stack traces
// Translates and evaluates ometajs code
//
function evalCode(code, filename) {
  return vm.runInThisContext(translateCode(code), filename || 'ometa');
};
exports.evalCode = evalCode;

// Allow users to `require(...)` ometa files
require.extensions['.ometajs'] = function(module, filename) {
  var code = translateCode(require('fs').readFileSync(filename).toString());

  module._compile(code, filename);
};

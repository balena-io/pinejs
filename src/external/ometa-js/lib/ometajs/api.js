var ometajs = require('../ometajs'),
    uglify = require('uglify-js'),
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
  throw objectThatDelegatesTo(fail(), {errorPos: i});
};

//
// ### function translationError(m, i)
// #### @m {Number}
// #### @i {Number}
//
function translationError(m, i) {
  throw fail();
};

//
// ### function wrapModule(module)
// #### @code {String} javascript code to wrap
// Wrap javascript code in ometajs.globals context
//
function wrapModule(code, options) {
  var req = 'require(\'' + (options.root || ometajs.root || 'ometajs') + '\')',
      buf = [
        'var ometajs_ = ', req, '.globals || global;'
      ];

  Object.keys(ometajs.globals).forEach(function(key) {
    buf.push('var ', key, ' = ometajs_.', key, ';\n');
  });

  buf.push(
    'if (global === ometajs_) {\n',
    '  fail = (function(fail) {\n',
    '    return function() { return fail };\n',
    '  })(fail);\n',
    '  OMeta = ', req, '.OMeta;\n',
    '}'
  );

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
                            utils.clone(ometajs.globals),
                            filename || 'ometa');
};
exports.evalCode = evalCode;

// Allow users to `require(...)` ometa files
require.extensions['.ometajs'] = function(module, filename) {
  var code = translateCode(require('fs').readFileSync(filename).toString());

  module._compile(code, filename);
};

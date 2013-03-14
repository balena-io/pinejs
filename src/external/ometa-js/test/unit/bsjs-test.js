var common = require('../fixtures/common');

exports['bsjsparser should generate ast'] = function(test) {
  var ast;
  test.doesNotThrow(function() {
    ast = common.ometajs.BSJSParser.matchAll('var x = 1', 'topLevel');
  });

  test.ok(Array.isArray(ast));
  test.done();
};

exports['bsjsidentity should not change ast'] = function(test) {
  var ast1,
      ast2;

  test.doesNotThrow(function() {
    ast1 = common.ometajs.BSJSParser.matchAll('var x = 1', 'topLevel');
    ast2 = common.ometajs.BSJSIdentity.matchAll([ast1], 'trans');
  });

  test.ok(Array.isArray(ast1));
  test.ok(Array.isArray(ast2));

  test.deepEqual(ast1, ast2);

  test.done();
};

exports['bsjstranslator should compile to js'] = function(test) {
  var ast,
      code;

  test.doesNotThrow(function() {
    ast = common.ometajs.BSJSParser.matchAll('var x = 1', 'topLevel');
    code = common.ometajs.BSJSTranslator.matchAll([ast], 'trans');
  });

  test.ok(Array.isArray(ast));
  test.ok(/var\s+x/.test(code));

  test.done();
};

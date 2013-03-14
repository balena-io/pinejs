var common = require('../fixtures/common');

exports['compile should work (w/o nodeRequirePath)'] = function(test) {
  var simple = common.compile('simple');

  test.ok(simple);
  test.ok(/require\("[^"]+"\)/g.test(simple));

  test.done();
};

exports['compile should work (with nodeRequirePath)'] = function(test) {
  var simple = common.compile('simple', { nodeRequirePath: 'test' });

  test.ok(simple);
  test.ok(/require\("test"\)/g.test(simple));

  test.done();
};

exports['evalCode should work'] = function(test) {
  var simple = common.evalCode('simple').Simple;

  test.equal(simple.matchAll([['simple']], 'top'), 'ok');

  test.done();
};

exports['require("...ometajs") should work'] = function(test) {
  var simple = common.require('simple').Simple;

  test.equal(simple.matchAll([['simple']], 'top'), 'ok');

  test.done();
};

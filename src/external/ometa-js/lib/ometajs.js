//
// OmetaJS
//

// JS modules
exports.core = require('./ometajs/core');

// Include API early
var api = require('./ometajs/api');

// Load parsers
var parsers = require('./ometajs/ometa/parsers');
[
  'BSNullOptimization', 'BSAssociativeOptimization',
  'BSSeqInliner', 'BSJumpTableOptimization',
  'BSOMetaOptimizer', 'BSOMetaParser',
  'BSOMetaTranslator', 'BSJSParser',
  'BSSemActionParser', 'BSJSIdentity',
  'BSJSTranslator', 'BSOMetaJSParser',
  'BSOMetaJSTranslator', 'BSPushDownSet'
].forEach(function(name) {
  exports[name] = parsers[name];
});

// API
exports.translateCode = api.translateCode;
exports.evalCode = api.evalCode;

// CLI
exports.run = require('./ometajs/cli').run;

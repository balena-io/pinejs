var ometajs = require('../ometajs'),
    core = ometajs.core;

//
// ### function Parser()
// Constructor for OMetaJS parser
//
exports.Parser = core.objectThatDelegatesTo(core.OMeta, {});

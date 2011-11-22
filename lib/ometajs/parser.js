var ometajs = require('../ometajs'),
    core = ometajs.core,
    utils = ometajs.utils;

//
// ### function Parser()
// Constructor for OMetaJS parser
//
exports.Parser = utils.objectThatDelegatesTo(core.OMeta, {});

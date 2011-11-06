var ometajs = require('../ometajs'),
    core = ometajs.core,
    utils = ometajs.utils;

exports.Parser = utils.objectThatDelegatesTo(core.OMeta, {});

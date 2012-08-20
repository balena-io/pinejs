//
// ### function lift(target, sources)
// #### @target {Object} object to lift properties to
// #### @sourcs {Array} source objects
// Lift all properties from source objects to target
//
exports.lift = function lift(target, sources) {
  sources.forEach(function(obj) {
    Object.keys(obj).forEach(function(key) {
      target[key] = obj[key];
    });
  });
};

//
// ### function clone (obj)
// #### @obj {Object} source
// Returns object with same property-value pairs as in source
//
exports.clone = function clone(obj) {
  var o = {};

  Object.keys(obj).forEach(function(key) {
    o[key] = obj[key];
  });

  return o;
};

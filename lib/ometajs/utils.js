//
// ### function unescape(s)
// #### @s {String} input
// Unescape character escaped with escapeChar
//
function unescape(s) {
  if (s.charAt(0) == '\\') {
    switch (s.charAt(1)) {
      case "'":  return "'";
      case '"':  return '"';
      case '\\': return '\\';
      case 'b':  return '\b';
      case 'f':  return '\f';
      case 'n':  return '\n';
      case 'r':  return '\r';
      case 't':  return '\t';
      case 'v':  return '\v';
      case 'x':  return String.fromCharCode(parseInt(s.substring(2, 4), 16))
      case 'u':  return String.fromCharCode(parseInt(s.substring(2, 6), 16));
      default:   return s.charAt(1);
    }
  }

  return s;
};
exports.unescape = unescape;

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

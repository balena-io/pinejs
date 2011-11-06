var ometajs = require('../ometajs');

exports.run = function run(options) {
  var input = [];

  options.input.on('data', function(chunk) {
    input.push(chunk);
  });

  options.input.once('end', function() {
    options.output.write(ometajs.translateCode(input.join('')));
    options.output.end('\n');
  });
};

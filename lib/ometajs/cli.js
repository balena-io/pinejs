var ometajs = require('../ometajs'),
    fs = require('fs');

exports.run = function run(options) {
  if (typeof options.input === 'string') {
    return finish(fs.readFileSync(options.input).toString());
  }

  var input = [];

  options.input.on('data', function(chunk) {
    input.push(chunk);
  });

  options.input.once('end', function() {
    finish(input.join(''));
  });

  function finish(input) {
    var out = ometajs.translateCode(input.join(''), options);

    if (typeof options.output === 'string') {
      fs.writeFileSync(options.output, out);
    } else {
      options.output.write(out);
      if (options.output !== process.stdout) {
        options.output.end();
      } else {
        options.output.write('\n');
      }
    }
  };
};

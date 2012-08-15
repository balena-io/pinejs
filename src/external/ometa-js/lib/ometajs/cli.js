var ometajs = require('../ometajs'),
    q = require('q'),
    fs = require('fs');

//
// ### function run (options)
// #### @options {Object} Compiler options
// Compiles input stream or file and writes result to output stream or file
//
exports.run = function run(options) {
  var deferred = q.defer(),
      input = [];

  options.input.on('data', function(chunk) {
    input.push(chunk);
  });

  options.input.once('end', function() {
    finish(input.join(''));
  });

  options.input.resume();

  function finish(input) {
    try {
      var out = ometajs.translateCode(input, options);
    } catch (e) {
      if (e.errorPos !== undefined) {
        console.error(
          input.slice(0, e.errorPos) +
          '\n--- Parse error ->' +
          input.slice(e.errorPos)
        );
      }

      deferred.reject(e);
      return;
    }

    options.output.write(out);
    if (options.output !== process.stdout) {
      options.output.end();
    } else {
      options.output.write('\n');
    }

    deferred.resolve();
  };

  return deferred.promise;
};

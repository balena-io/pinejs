exports.main = function() {

    var sys = require('sys'),
        fs = require('fs'),
        args = process.argv.slice(2),
        arg,
        options = {};

    while(args.length) {
        arg = args.shift();
        switch (arg) {
            case '-h':
            case '--help':
                sys.puts([
                    'Usage: ometajs2js [options]',
                    '',
                    'Options:',
                    '  -i, --input : pecifies filename to read the input source, required',
                    '  -o, --output : specifies filename to write the output, required',
                    '  -h, --help : Output help information'
                ].join('\n'));
                process.exit(1);
                break;
            case '-i':
            case '--input':
                options.input = args.shift();
                break;
            case '-o':
            case '--output':
                options.output = args.shift();
                break;
        }
    }

    if(!options.input || !options.output) {
        sys.error('Input and output required both.');
        process.exit(1);
    }

    fs.readFile(options.input, 'utf8', function(err, input){
        if (err) throw err;

        try {
            var result = require('/Users/veged/Documents/ometa-js/lib/ometajs').translateCode(input) + '\n';
            options.output ?
                fs.writeFile(options.output, result, function(err) {
                        if (err) throw err;
                        sys.error('  create : ' + options.output);
                    }) :
                sys.puts(result);
        } catch (e) {
            e.errorPos != undefined &&
                sys.puts(
                    input.slice(0, e.errorPos) +
                    " Parse error ->" +
                    input.slice(e.errorPos) + '\n');
            throw e
        }
    });


};

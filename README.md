# OMeta/JS

OMeta/JS is a JavaScript implementation of OMeta,
a object-oriented language for pattern matching.

This repository is a fork.
I allowed myself to much to restructure the code under the common layout
and make the file extensions for ease of compilation.
There is also the NPM package and a command line utility.

To study Ometa/JS and questions about the core is better
to contact the [original repository](http://github.com/alexwarth/ometa-js/)
and its author, [Alessandro Warth](http://github.com/alexwarth).

## Usage

### Command line

Used to compile the file in Ometa/JS to CommonJS module that exports objects grammars.

    > ometajs2js --help
    Usage: ometajs2js [options]

    Options:
        -i, --input : pecifies filename to read the input source, if omit use STDIN
        -o, --output : specifies filename to write the output, if omit use STDOUT
        -h, --help : Output help information

### CommonJS module

`require('ometajs')` provides all grammars in Ometa/JS core.

### Examples

Some projects are using this:
-   [ShmakoWiki](http://github.com/veged/shmakowiki/)
-   [OmetaHighlighter](http://github.com/veged/ometa-highlighter)
-   [XJST](http://github.com/veged/xjst)

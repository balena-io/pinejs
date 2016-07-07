# Pine.js
Pine.js is a rules-driven API engine that enables you to define rules in a structured subset of English. Those rules are used in order for Pine.js to generate a database schema and the associated [OData](http://www.odata.org/) API.

Rules are described in *SBVR* format, which stands for "Semantics of Business Vocabulary and Business Rules". SBVR provides a way to capture specifications in natural language and represent them in formal logic, so they can be machine processed. In order to get an idea of how SBVR works, visit the [sbvr lab](http://www.sbvr.co/).

The following tools demonstrate the way to use the compile chain from a SBVR file to SQL and from an OData URL to SQL: 

* [https://github.com/resin-io-modules/sbvr-compiler](https://github.com/resin-io-modules/sbvr-compiler)
* [https://github.com/resin-io-modules/odata-compiler](https://github.com/resin-io-modules/odata-compiler)

Both tools use some of the main dependencies of Pine.js:

* abstract-sql-compiler
* lf-to-abstract-sql
* sbvr-parser
* odata-parser
* odata-to-abstract-sql

The above packages are written in `OMeta` and compiled into Javascript. The following resources consitute a good starting point in order for someone to get a better understanding of OMeta and the above dependencies:

* [OMeta paper](http://www.tinlizzie.org/~awarth/papers/dls07.pdf)
* [OMeta slides](http://www.tinlizzie.org/ometa/dls07-slides.pdf)
* [Introduction to OMeta-js](http://b-studios.de/ometa-js/)
* [OMeta workspace](http://tinlizzie.org/ometa-js/#OMeta_Tutorial)
* [Related blog posts](http://codeofrob.com/entries/ometa-odata-odear---polishing-it-off.html)

The following papers are also helpful in understanding the main concept of Pine.js:

* [An SBVR to SQL Compiler](http://ceur-ws.org/Vol-649/paper7.pdf)
* [Generating SQL Queries from SBVR Rules](http://link.springer.com/chapter/10.1007%2F978-3-642-16289-3_12)

One can experiment with `pine.js`, its main dependencies and the above tools inside the development environment of resin.

For a starter's introduction to Pine.js Models and OData API, please refer [here](https://resinio.atlassian.net/wiki/display/RES/Pine.js%2C+Models+and+OData+API).

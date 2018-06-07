# Pine.js
Pine.js is a sophisticated rules-driven API engine that enables you to define rules in a structured subset of English. Those rules are used in order for Pine.js to generate a database schema and the associated [OData](http://www.odata.org/) API. This makes it very easy to rapidly create, update and maintain a backend while keeping the logic in an easily understood form, as well as providing the ability to update and maintain this logic going forward.

Rules are described in *SBVR* format, which stands for "Semantics of Business Vocabulary and Business Rules". SBVR provides a way to capture specifications in natural language and represent them in formal logic, so they can be machine processed. 

The basic components of SBVR are as follows:

* Terms - these are the atomic elements of your data model, defined via `Term: [Term Name]`. Generally speaking, these map to tables in a relational database, or attributes of other tables.
* Fact Types - these define *relations* between different terms and properties of those terms, e.g. `Fact type: pilot can fly plane` or `Fact type: pilot is experienced` - these *somewhat* map to fields and foreign keys in a relational database.
* Rules - these define *logical constraints* on the data model and is the most powerful aspect of SBVR and Pine.js itself. Rules map loosely to constraints in a relational database, but extend them to constraints that can traverse tables and generally be far more powerful than a database constraint. E.g. `Rule: It is obligatory that each pilot can fly at least 1 plane`. The expressive capability of SBVR rules is much more than simple SQL DDL, and has the full power of First Order Logic.

In order to get an idea of how SBVR works, visit the [sbvr lab](http://www.sbvr.co/), and for more details, check out the [SBVR spec](http://www.omg.org/spec/SBVR/).

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

The documentation inside /docs folder also provide a great overview of the main concepts of Pine.js, in particular:

* [docs/Migrations.md](docs/Migrations.md): provides information regarding sql queries or Javascript functions that are executed prior to pinejs executing a given SBVR model.
* [docs/Hooks.md](docs/Hooks.md): functions that you can implement in order to execute custom code when API calls are requested.
* [docs/ProjectConfig.md](docs/ProjectConfig.md): provides information regarding creating and configuring a project.
* [docs/Types.md](docs/Types.md): types definitions and declarations in various systems.
* [docs/sequence-diagrams/](docs/sequence-diagrams): provide a great overview of how the main processes are executed, including OData request parsing, response processing, etc. (The sequence diagrams can be depicted in [websequencediagrams.com](https://www.websequencediagrams.com))

One can experiment with Pine.js, its main dependencies and the above tools inside the development environment of resin.


### Where to go from here:
Start by creating your very first application with Pine.js. Jump to the [Getting Started guide](https://github.com/resin-io/pinejs/blob/master/docs/GettingStarted.md).


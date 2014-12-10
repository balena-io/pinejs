# Overview

Pine.js is a sophisticated Rules-driven API engine developed in-house at
Resin.io. Historically it was our core product before we pivoted to Resin (this
is why our company name is 'Rulemotion'.)

At core Pine.js enables you to define rules in a structured subset of English
which it uses to generate a database schema and associated [OData][odata] API.

This makes it very easy to rapidly create, update and maintain a backend while
keeping the logic in an easily understood form, as well as providing the ability
to update and maintain this logic going forward.

Further documentation is available in the [docs folder][docs] in this repo.

## SBVR

Underpinning Pine.js is [SBVR][sbvr]. SBVR stands for 'Semantics of Business
Vocabulary and Business Rules' and SE means Structured English.  The underlying
formalism is SBVR-LF, where LF stands for Logical Formulation.  The Structured
English layer could be replaced with a more programming-friendly form in the
future.

The best means of playing with SBVR and getting a sense of how it works is our
[SBVR lab][sbvr-lab], where you will find a number of examples, e.g. a
[pilot model][sbvr-lab-pilots].

The basic components of SBVR are as follows:-

* Terms - these are the atomic elements of your data model, defined via `Term:
  [Term Name]`. Generally speaking, these map to tables in a relational
  database, or attributes of other tables.

* Fact Types - These define *relations* between different terms and properties
  of those terms, e.g. `Fact type: pilot can fly plane` or `Fact type: pilot is
  experienced` - these *somewhat* map to fields and foreign keys in a relational
  database.

* Rules - These define logical constraints on the data model's terms and is the
  most powerful aspect of SBVR and Pine.js itself. Rules map loosely to
  constraints in a relational database. E.g. - `Rule: It is obligatory that each
  pilot can fly at least 1 plane`. The expressive capability of SBVR Rules is much
  more than simple SQL DDL, and has the full power of First Order Logic.

Of course this is a *very* brief introduction to SBVR - for (probably more than
you want) details, check out the [SBVR spec][sbvr-spec].

## API

Pine.js generates APIs that aspire to be compatible with the [OData][odata] standard.

## Building from Source

The [Projects documentation page][projects-doc] gives detailed instructions on
building Pine.js from source. Pine.js is distributed as a single javascript file
typically named `pine.js` which contains aggregated code capable of reading
an SBVR file and generating an API. Configuration is read from `config.json` in
the same directory as `pine.js` and described further in the aforementioned
project doc.

Note that you must have PostgreSQL up and running before attempting to build
from source and then must run `bower install` before `npm install`. At the time
of writing `npm install` generates `pine.js` for you as a post-install hook.

In order to ensure you have the correct dependencies installed, you need to copy
the dependencies from [package.json][package.json] into your project.

## Example Application

The [Pine.js Example Application][pine-example] is the best means of getting up
to speed with Pine.js and the [Pine.js API][pinejs-client-js] (a
library for interacting with Pine.js simply from the frontend) - it contains an
end-to-end working 'ToDo' web application.

[sbvr]:http://en.wikipedia.org/wiki/Semantics_of_Business_Vocabulary_and_Business_Rules
[odata]:http://en.wikipedia.org/wiki/Open_Data_Protocol
[docs]:.
[sbvr-lab]:http://www.sbvr.co/
[sbvr-lab-pilots]:http://www.sbvr.co/#/3E3tU3
[pine-example]:https://bitbucket.org/rulemotion/pine-example
[pinejs-client-js]:https://bitbucket.org/rulemotion/pinejs-client-js
[sbvr-spec]:http://www.omg.org/spec/SBVR/1.2/
[projects-doc]:Projects.md
[odata]:http://www.odata.org/
[package.json]:../package.json

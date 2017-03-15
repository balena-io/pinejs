# Pinejs Architecture

This documents aims to serve as a high-level overview of how Pinejs works, especially oriented for contributors who want to understand the big picture.


## Techologies

This is a non-exhaustive list of the technologies used in Pinejs

- SBVR
- OData
- Express
- OMetaJS
- ...

## Modules
### Config Loader

This module exports a function to load configuration files into Pinejs. This module exports a ```setup``` function which must be called with the express app object as argument. It will return an object that can be used to load internal and external configuration files when starting up Pinejs.
Refer to [ProjectConfig](https://github.com/resin-io/pinejs/blob/master/docs/ProjectConfig.md) for more information about the structure of configuration files.
Most of the following internal modules define an SBVR model that is loaded through the config loader, the config loader allows the user to specify some ```customServerCode``` that is executed right after loading the model. You can refer to [CustomServerCode](https://github.com/resin-io/pinejs/blob/master/docs/CustomServerCode.md) for more information on how this can be done.

### Database Layer

This module defines an abstract ```Tx``` class that represents database transactions. It currently contains three concrete implementations of this class, one for each supported database: MySql, Postgres, WebSql. The ```Tx``` constructor, which should be called in the constructor of any concrete implementation, takes three functions as arguments: one to execute SQL queries, one to rollback a transaction, and one to commit.

### Migrator

This module is in charge of checking and running migrations over the database. Migrations are usually loaded at startup time via the configuration loader. Once a migration has ran this fact is permanently recorded in the database through the ```migrations``` resource. Migrations are supposed to run only when a database schema already exists in order to align the already existing schema and data with the desired state. If a database schema does not exist yet (i.e. the very first run of the Pinejs application), migrations are skipped and marked as executed.

### Passport Pinejs

This module defines express middleware to enable passport (or passport like if running in the browser) authentication. The module exports middleware functions ```login``` and ```logout```.

### Pinejs Session Store

This module defines the session model and exports the ```PinejsSessionStore``` object to store/retrieve/delete sessions.

### SBVR-Api

This module takes care of a lot of the heavy lifting happening in Pinejs. It takes care of initializing the ```Auth``` and the ```Dev``` model, it also defines the ```handleODataRequest``` route, which is used to interact with the database via OData requests.

This models ```setup``` function is very important, it must be called before loading any other models, this is because it must initialize both the ```Dev``` and ```Auth``` models, which should be loaded before any other.

This module essentially provides an API to interact with OData and SBVR from the rest of the codebase. For this reason it is imported by many of the previously mentioned modules.
For example the ```config-loader``` will import this and use the ```executeModel``` function to parse an SBVR file into a set of database operations.
This module also exports ```handleODataRequest``` which is an express endpoint that can handle OData queries against the models that are initialized. Alongside that, the module also exports a ```runURI``` function which is used internally to perform OData queries at runtime, it is simply implemented as a wrapper around ```handleODataRequest```.

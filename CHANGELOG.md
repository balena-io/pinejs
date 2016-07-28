* Fix use of multer in server builds

v2.2.0

* Updated sbvr-parser and lf-to-abstract-sql to add support for concept types on term form fact types.

v2.1.1

* Fixed getting api key actor ids
* Fixed the 2.0-add-actors migrations

v2.1.0

* Updated odata-to-abstract-sql and switch to using `setClientModel` to have it shorten aliases when necessary.
* Fixed invalid permission filters not being rejected.
* Return result for $count
* Updated to abstract-sql-compiler 2.1.0
* Updated to odata-parser 0.1.10
* Updated to odata-to-abstract-sql 0.3.5

v2.0.0

* Return a 400 error when a request ends fails SBVR model validation (previously 404).
* Switched to adding users/permissions after a model and it's migrations are run, this makes it much easier to migrate permissions.
* Added a concept of actors and switched the permission filter `$USER.ID` magic to be `$ACTOR.ID`
* Updated to abstract-sql-compiler 2.0.0, meaning empty strings are no longer treated as null.
* Dropped expressjs3 compatibility, fixing deprecated notices on expressjs4.
* Added expiry date fields onto the permissions system.

v1.4.2

* Updated minimum odata-to-abstract-sql to v0.3.4 in order to bring in support for self-referencing resources (eg application depends on application)

v1.4.1

* Added PREPARSE hooks and use them in the permissions module in order to be backwards compatible with the behavior in <1.4.0

v1.4.0

* Isolated the http transactions code purely into a module so it is optional.
* Separated permissions into a mostly isolated module, using proper hooks instead of hardcoded hooks.
* Added support for 'all' hooks on the api and method levels.
* Switched to throwing specific errors for unique/foreign key/general constraint errors, rather than always just a generic database error.
* Converted cases of throwing strings into throwing error objects.
* Separated out the api key permissions cache settings so they can be overridden if need be.

v1.3.0

* Updated odata-parser, odata-to-abstract-sql, and abstract-sql-compiler to add support for date/time functions and some bugfixes.
* Added memoisation for permission filter generating.
* Simplified permission filter checking.
* Respond with 400 Bad Request to malformed odata queries.
* Avoid recreating the collapse function.
* Separated out the OData schema generation.

v1.2.0

* Updated to pinejs-client ^2.3.1 and remove deprecated uses of it.

v1.1.0

* Added express 4 compatibility.

v1.0.5

* Fixed 'all' hooks overriding resource hooks.
* Fixed `read` permission for $expands.

v1.0.3

* Updated to lodash 4
* Updated pinejs-client to ^2.1.1 to make sure the escaping fix is included.
* The OData functions `startswith` and `endswith` are now correctly `(haystack, needle)` instead of `(needle, haystack)`
* Changed the 'POSTPARSE' hook to run immediately after the uri parsing, before any permissions are added.
* Added support for hooks on the 'all' resource, which will be run for any resource.
* Updated to bluebird 3.

v0.6.4

* Updated odata-to-abstract-sql to ~0.3.0 and abstract-sql-compiler to ~0.4.2.
* Added bower to the local dependencies.

v0.6.3

* Update odata-to-abstract-sql to ~0.2.6 to guarantee the $expand($expand) fix is available.

v0.6.2

* Now returns 201 with `{ id }` instead of 401 when creating a resource without permission to read it.

v0.6.1

* Updated abstract-sql-compiler and switched to using it for schema generation.

v0.6.0

* Removed the default root permissions for internal requests, you must now explicitly specify them.

v0.5.6

* Pass an `api` instance to hooks, which is bound to the same user and transaction scope as the original request.

v0.5.5

* Added `authorizationMiddleware` and `customAuthorizationMiddleware` middlewares which allow supporting the passing api keys via an `Authorization` header.
* Add the following additional permissions: read, create, update.  These can be used for finer grained permission and also to allow specifying permissions via the CRUD names.

v0.5.4

* Switched to using npm private packages rather than private git repo links.
* Updated package.json to specify that nodejs 0.12 is also supported.

v0.5.3

* Update passport to ^0.2.1 and passport-local to ^1.0.0
* Expose the initialisation promise from server.coffee so that it is possible to wait on it.
* Fix in-browser server.

v0.5.2

* Updated sbvr-types to v0.1.2

v0.5.1

* Updated odata-to-abstract-sql to v0.2.4

v0.5.0

* Config loader will directly use the customServerCode entry if it is an object.
* Config loader no longer tries to use requirejs to load the custom server code - it only uses require now.
* Removed the requirejs param from the custom code setup function.
* Added support for falling back to bcryptjs if bcrypt isn't available (eg in the browser)
* Added support for $expand options (eg $expand=resource($filter=id eq 1))
* Added support for "It is forbidden that.." in the sbvr parser.
* Updated lodash to ^3.0.0
* Updated coffee-script to ~1.9.0
* Updated postgres to ^4.0.0
* Updated mysql to ^2.1.0
* Updated express to ^4.11.2
* Updated pinejs-client to ^1.0.0
* Fixed issues with auto incrementing fields on mysql/websql.
* Permission filters are now applied to `$expand`s as well.
* Improved error messages, particularly for config.json users/custom code loading errors.
* Moved express, mysql, passport, passport-local, and pg to optional dependencies, as they are indeed optional.
* Fixed certain combinations of permission filters failing to translate.
* Added support for loading config.json via absolute paths
* Added support for loading pinejs via npm

v0.4.5

* Fix a `ReferenceError: logger is not defined` when compiling abstract sql fails.
* Update abstract-sql-compiler to v0.2.1 which properly supports null comparisons.
* Fix visualisation of vocabularies containing term forms.
* Fix visualisation links not appearing if you go to the LF tab first.

v0.4.4

* Fix a `"Cannot parse required checks: false"` error that could happen with permission checking if api key or guest permissions returned `false`.
* Update pinejs-client-js to v0.3.1 which supports true/false/null filters, making them easier to use.

v0.4.3

* Update odata-parser and odata-to-abstract-sql to add support for true/false/null in OData filters.

v0.4.2

* Update bcrypt to ~0.8.0
* Update bluebird to ~2.3.11
* Update bluebird-lru-cache to ~0.1.2
* Update coffee-script to ~1.8.0
* Updated odata-to-abstract-sql and abstract-sql-compiler to add support for $filter on PUT requests and enhanced security.
* Update lf-to-abstract-sql to add support for setting foreign keys nullable in a term form.

v0.4.1

* Update odata-to-abstract-sql and abstract-sql-compiler to add support for CASTing bind vars to the correct type when necessary (avoids issues in cases where implicit casts failed)

v0.4.0

* All instances of `platform`/`rulemotion-canvas` have been renamed to `pinejs`
* __model is no longer sent on GET requests to a resource.
* `ConfigLoader.loadNodeConfig` has been removed (use `ConfigLoader.loadApplicationConfig` instead)
* Correctly process expanded results again (an update to `node-pg` made the `JSON.parse` unnecessary and hence fail).
* Update to pinejs-client-js v0.3.0, this adds greatly enhanced filter support.
* Support has been added for filters on POST requests.

v0.3.11

* Update resin-platform-api to v0.2.5
* Add an `sbvrUtils.apiKeyMiddleware` connect middleware that can be used to fetch the permissions of an api key on the request and add them to `req.apiKey`.

* Add support for running migrations before a model executes:
	* Can specify `migrations` or a `migrationsPath` in config.json
	* Migrations which haven't been executed will run in order before the model is executed

v0.3.10

* Added a PRERESPOND hook for manipulating the response to OData queries

* Update sbvr-types to v0.0.2, fixes issues with:
	* Saying max length of a string is 255 even if it is actually another value.
	* Sending a colour object to the api.
	* Sending an invalid JSON string to a JSON field.
* Add a __resourceName property in the response to running a rule, so you know what resource you are dealing with.

* Built-in web server now logs all requests it receives - not just OData requests

* Increase default transaction timeout from 5s to 10s

* configLoader.loadNodeConfig has been renamed to configLoader.loadApplicationConfig

v0.3.9

* SQL queries are only logged when debugging
* Dev model .log output is now suppressed
* TRANSACTION_TIMEOUT_MS environment variable can be used again

v0.3.8

* PlatformSessionStore is now exported from module build

v0.3.7

* Adds a new 'module' build type, which allows you to:
	* Configure your own express application
	* Use the platform as a library, rather than having your app loaded as custom code

* Added support for `and`/`or` within SBVR rules.
* Fix bower requirejs to v2.1.9 as later versions break the platform client-side (due to shim dependencies not working correctly)

v0.3.6

* Fix internal POST requests that are run within a passed in transaction, introduced in v0.3.4.

v0.3.5

* Custom code modules no longer have to define a setup() method

v0.3.4

* Enable disabling the default platform login/logout handling with the `DISABLE_DEFAULT_AUTH` env var.
* POST requests now include the whole entity in the response.
* Expose `{ app, sbvrUtils }` on the built `platform.js`, meaning you can require it in order to get access to these objects.

v0.3.3

* Changed config-loader to return 200 for any OPTIONS requests on the API endpoints it sets up.
* Added an LRU cache for API key permissions - improves performance for repeated requests using the same API key.

v0.3.2

* Add API hooks entry for OPTIONS
* Fixed an error when handleODataRequest was called from a method it did not recognise for API hooks.
* Properly send a 405 for unsupported methods.
* Handle responding to an OPTIONS request, and use the model permission for it (since it's a metadata request)

v0.3.1

* Updated pg to v3.3.0
* Update bluebird to v2.2.1
* Improved performance of SQL queries when we do not need to bind any default values.
* Improve performance of creating a transaction.
* Improve performance of all PostgreSQL queries and any SQL queries that bind default values.
* Improve the performance of PostgreSQL queries when there are no binds in the SQL.

v0.3.0

* Change runURI signature from `(method, uri, body = {}, tx, callback) ->` to `(method, uri, body = {}, tx, req, callback) ->`, where if `req` is an object then it will have its `user` property used for permission checking rather than using the default of full permissions if it's not an object.
* Update sbvr-parser to v0.0.12
	* Fixes an error being logged when trying to get hints for the verb part of a new fact type
	* Fixes rule-like definitions for terms and names
* Fix an issue where api keys that looked like valid user ids were treated as a user id.
* Replaced `runGet`, `runPost`, `runPut`, and `runDelete` with a new middleware called `handleODataRequest` that can be used in their place.
* Updated bluebird to v2.1.3
* The `checkPermissions` function had its `res` argument removed.
* Added API hooks facilities via `sbvrUtils.addHook` with the following hook points:
	* POSTPARSE
	* PRERUN
	* POSTRUN
* In the case of trying to respond to a request with an `Error` instance, we instead send the `message` property instead, as it's generally much more useful.

v0.2.29

* Update ometa-js to ~1.3.0 and use the new line by line highlight option, which removes the need for the custom codemirror change and also updates to work with the latest codemirror (including a switch to the newer hinting module).
* Update codemirror to v4.2.0 and load it from bower now that a custom change is no longer needed.
* Use a SQL hinter for the database import/export tab.
* Improve generic error messages returned for foreign/unique key violations in cases where detailed info cannot be obtained.

v0.2.28

* Add support for a TRANSACTION_TIMEOUT_MS env var, that specifies how long before a transaction is automatically closed (via a rollback).
* Use error codes to detect the error type for postgresql, this makes the checking much more resilient.
* Updated bluebird to ~1.2.4

v0.2.27

* sbvrUtils.executeModel and sbvrUtils.executeModels now expect a model object, rather than vocabulary name/sbvr text.
* Improved constraint failure checks for WebSQL.
* 500 errors are now used correctly, rather than incorrect 50x variants.
* PUT requests are now correctly rolled back on a rule violation
* Database errors (that are not related to constraints) now return a 500 and no longer leak the error to the client.
* Logging levels can now be configured on a per-model basis.
* Session model requests now only log errors.

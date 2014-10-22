# Custom Server Code
## Setup
Custom server code should be provided in either Javascript or CoffeeScript format.
The module may export a function with the following signature:
`setup(app, requirejs, sbvrUtils, db)`  
If provided this function will be called whilst the server starts up and can be used to add custom server code for your project.
This function can return a promise, which the server will wait upon if you need to initialize something before the server listens.

### app
This is an [express.js](http://expressjs.com/) app instance, and can be used to add your own routes.  

### requirejs
The [requirejs](http://requirejs.org/) object used by the platform, can be used to include files.  

### sbvrUtils
An entry point to the API internally to the server.

#### runURI(method, uri, body = {}[, tx, req, callback])
This allows making an API request internally that should match the result of making an equivalent http request to the API, and returns a promise.<br/>
The request will be run with full privileges unless the `req` object is provided to instruct using a specified user.
##### tx
If provided, this should be an open transaction created with db.transaction, which will be used for running any database statements related to this API call.
##### req
If provided, this should be an an object.<br/>
When provided the `users` and `apiKey` properties of this object will be used for permission checks (if they are null/undefined then it will default to guest user permissions).


#### class PlatformAPI
This is a subclass of the resin-platform-api class, which supports the additional special `req` and `tx` properties on the query objects.  The functionality of these properties match their counterparts on runURI.

#### api
This is an object containing keys of the api root and values that are an instance of PlatformApi for that api.  The PlatformAPI instance also contains an additional `logger` property, which matches the interface of `console`, but which understands provided logging levels.

#### executeModel(tx, model[, callback])
This is an alias for executeModels for the case of a single model.

#### executeModels(tx, models[, callback])
Executes the given models and returns a promise.
##### tx
This should be an open transaction created with db.transaction
##### models
This is an array which contains model objects, matching the model object of the config.json file.
##### callback
This is an (err, result) callback.

#### deleteModel(vocabulary[, callback])
Deletes the given vocabulary and returns a promise.
##### vocabulary
The name of the vocabulary to delete.
##### callback
This is an (err, result) callback.

#### runRule(vocab, rule[, callback])
Runs the given rule text against the vocabulary and returns a promise that resolves to any violators.
##### vocab
The vocabulary to run the rule against
##### rule
This is a rule text, eg. Each pilot can fly at least 1 plane
##### callback
This is an (err, result) callback.


#### getUserPermissions(userId[, callback])
This returns a promise that resolves to the user permissions for the given userId

#### getApiKeyPermissions(apiKey[, callback])
This returns a promise that resolves to the api key permissions for the given apiKey

#### apiKeyMiddleware(req, res, next)
This is a default `customApiKeyMiddleware`, which is useful to avoid having to create your own default one.

#### customApiKeyMiddleware(paramName = 'apiKey')
This is a function that will return a middleware that checks for a `paramName` using `req.params(paramName)` and adds a `req.apiKey` entry `{ key, permissions }`.<br/>
The middleware can also be called directly and will return a Promise that signifies completion.

#### checkPermissions(req, permissionCheck, request[, callback])
This checks that the currently logged in (or guest) user has the required permissions

#### checkPermissionsMiddleware(permissionCheck)
This generates a middleware that will run the given permissionCheck

#### handleODataRequest
This is a middleware that will handle an OData request for GET/PUT/POST/PATCH/MERGE/DELETE

#### executeStandardModels(tx[, callback])
This executes the built in models (dev, transaction, Auth) and returns a promise that resolves upon completion.

#### addHook(method, apiRoot, resourceName, callbacks)
This runs adds a callback to be run when the specified hookpoint is triggered.
##### method
This can be one of GET/PUT/POST/PATCH/DELETE (also MERGE as an alias for PATCH)
##### apiRoot
The apiRoot to hook into, eg. Auth
##### resourceName
The name of the resource under the apiRoot to hook into, eg user
##### callbacks
An object containing a key of the hook point and a value of the callback to call. See [Hooks documentation](./Hooks.md) for more

#### setup(app, requirejs, db[, callback])
This is called by the server, you should never need to use this.

### db
An object that allows direct connection to the database, which is similar to the WebSQL interface but allows asynchronous actions.

#### engine
A lowercase string that denotes the current database engine in use (possible values are currently: postgres, mysql, websql, and sqlite)

#### executeSql(sql, bindings[, callback])
This runs the given SQL statement in a transaction of it's own, with ? bindings replaced by the values in the bindings array and returns a promise.
#### callback
This has a signature of (err, result)

#### transaction([callback])
Returns a promise that will provide a "tx" object.
##### callback
This callback is called with a "tx" object.

### tx
This is created by a succesful call to `db.transaction`.

#### executeSql(sql, bindings[, callback])
This runs the given SQL statement in the context of the transaction it is called on, with ? bindings replaced by the values in the bindings array and returns a promise.
#### callback
This has a signature of (err, result)

#### end()
This ends/commits a transaction.

#### rollback()
This rolls back a transaction.

#### tableList(extraWhereClause = ''[, callback])
This returns a promise that resolves to a list of tables, the extraWhereClause can reference a "name" which will be the table's name.
#### callback
This has a signature of (err, result)

#### dropTable(tableName, ifExists = true[, callback])
This will drop the given table, returning a promise.
#### tableName
The name of the table to drop.
#### ifExists
Whether to use an "IF EXISTS" clause or not.
#### callback
This has a signature of (err, result)

### result
#### rows
An object matching the following
##### length
This number of rows returned
##### item(i)
Fetch the item at the given index
##### forEach(iterator, thisArg)
This acts like a standard Array.forEach call, to allow easier iteration of the rows.
##### map(iterator, thisArg)
This acts like a standard Array.map call, to allow easier iteration of the rows.

#### rowsAffected
The number of rows affected by the statement.
#### insertId
This id of the first row inserted, if any.

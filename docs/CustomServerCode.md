# Custom Server Code
## Setup
Custom server code should be provided in either Javascript or CoffeeScript format, and should export a function with the following signature:  
`setup(app, requirejs, sbvrUtils, db)`  
This function will be called whilst the server starts up and can be used to add custom server code for your project.

### app
This is an [express.js](http://expressjs.com/) app instance, and can be used to add your own routes.  

### requirejs
The [requirejs](http://requirejs.org/) object used by the platform, can be used to include files.  

### sbvrUtils
An entry point to the API internally to the server.

#### runURI(method, uri, body = {}, tx, callback)
This allows making an API request internally, should match a similar AJAX request to the API.

#### executeModel(tx, vocab, seModel, callback)
This is an alias for executeModels for the case of a single model.

#### executeModels(tx, models, callback)
Executes the given models.
##### tx
This should be an open transaction created with db.transaction
##### models
This is an object where the keys are the vocabulary names and the values are the models.
##### callback
This is an (err, result) callback.

#### deleteModel(vocabulary)
Deletes the given vocabulary.

#### runRule(vocab, rule, callback)
Runs the given rule text against the vocabulary and returns any violators.
##### vocab
The vocabulary to run the rule against
##### rule
This is a rule text, eg. Each pilot can fly at least 1 plane
##### callback
This is an (err, result) callback.


#### getUserPermissions(userId, callback)
This returns the user permissions for the given userId

#### checkPermissions(req, res, permissionCheck, request, callback)
This checks that the currently logged in (or guest) user has the required permissions

#### checkPermissionsMiddleware(permissionCheck)
This generates a middleware that will run the given permissionCheck

#### runGet(req, res, tx)
Processes a GET request, will use the given transaction if supplied.

#### runPost(req, res, tx)
Processes a POST request, will use the given transaction if supplied.

#### runPut(req, res, tx)
Processes a PUT request, will use the given transaction if supplied.

#### runDelete(req, res, tx)
Processes a DELETE request, will use the given transaction if supplied.

#### parseURITree(req, res, next)
This is an express middleware that will require the URI to parse as a valid platform OData request.

#### executeStandardModels(tx, callback)
This executes the built in models (dev, transaction, Auth)

#### setup(app, requirejs, db, callback)
This is called by the server, you should never need to use this.

### db
An object that allows direct connection to the database, which largely follows the WebSQL interface.

#### engine
A lowercase string that denotes the current database engine in use (possible values are currently: postgres, mysql, websql, and sqlite)

#### transaction(callback, errorCallback)
##### callback
This callback is called on success, with a "tx" object.
##### errorCallback
This callback is called on failure, with an error.

### tx
This is created by a succesful call to `db.transaction`

#### executeSql(sql, bindings, callback, errorCallback)
This runs the given SQL statement, with ? bindings replaced by the values in the bindings array.
#### callback
This has a signature of (tx, result)
#### errorCallback
This has a signature of (tx, err)

#### begin()
This begins a transaction

#### end()
This ends a transaction

#### rollback()
This rolls back a transaction

#### tableList(callback, errorCallback, extraWhereClause = '')
This returns a list of tables, the extraWhereClause can reference a "name" which will be the table's name.
#### callback
This has a signature of (tx, result)
#### errorCallback
This has a signature of (tx, err)

#### dropTable(tableName, ifExists = true, callback, errorCallback)
This will drop the given table.
#### callback
This has a signature of (tx, result)
#### errorCallback
This has a signature of (tx, err)

### result
#### rows
An object matching the following
##### length
This number of rows returned
##### item(i)
Fetch the item at the given index
##### forEach(iterator, thisArg)
This acts like a standard Array.forEach call, to allow easier iteration of the rows.

#### insertId
This id of the first row inserted, if any.
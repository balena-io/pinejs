# Hooks
The hooks are adding using `sbvrUtils.addHook`.
In order to to roll back the transaction you can either throw an error, or return a rejected promise.
Also, any promises that are returned will be waited on before continuing with processing the request.
## Hook points
* POSTPARSE({req, request})
	The `request` object for POSTPARSE is lacking the `abstractSqlQuery` and `sqlQuery` entries.
* PRERUN({req, request, tx})
* POSTRUN({req, request, result, tx})
* PRERESPOND({req, res, request, result, data})
	The `data` object for PRERESPOND is only present for GET requests

## Arguments
### req
This is usually an express.js req object, however in the case of an internal API call it will only have the following properties (so you should only rely on these being available):

* user
* method
* url
* body

### request
This is an object describing the current request being made and contains the following properties:

#### method
The method of the current request, eg GET/PUT/POST
#### vocabulary
The API root that the request is for, eg Auth
#### resourceName
The resource that the request relates to, eg user
#### odataQuery
The OData OMeta structure.
#### abstractSqlQuery
The Abstract SQL OMeta structure.
#### sqlQuery
The SQL OMeta structure.
#### values
The "body" of the request.
#### custom
This is an empty object, you may store whatever you like here and have it available in later hooks.

### result
This is the result from running the transaction.

* GET - A database result object with the unprocessed rows that have been queried.
* POST - The inserted/updated id.
* PUT/PATCH/MERGE/DELETE - null

### data
* GET - This is the result after being processed into a JSON OData response (i.e. the 'd' field).

### tx
The database transaction object, so that you can run queries in the same transaction or make API calls that use the same transaction.

See [tx](./CustomServerCode.md#markdown-header-tx_2)

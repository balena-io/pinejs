# Hooks
The hooks are adding using `sbvrUtils.addHook`.
In order to to roll back the transaction you can either throw an error, or return a rejected promise.
Also, any promises that are returned will be waited on before continuing with processing the request.
## Hook points
* POSTPARSE({req, request})

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
#### values
The "body" of the request.
# User System

## Permissions

### Format
Permissions currently work by having a name which defines what the permission covers.  
The formats for this are as follows:

* resource.{action} - Grants the permission for {action} on all resources.
* {vocabulary}.{action} - Grants the permission for {action} on all resources of {vocabulary}.
* {vocabulary}.{resource}.{action} - Grants the permission for {action} on the {resource} of {vocabulary}.

### Actions
#### model
Used for accessing the model alone for a resource
#### get
Used for getting records of a resource (model is included when fetching records)
#### set
Used for setting records of a resource
#### delete
Used for deleting records of a resource

## Default/Guest User Permissions
All users (including ones who are not logged in) automatically gain any permissions assigned to the account named 'guest'.  You can create this user by inserting into the database tables following the model below.

### Model
The SBVR model for users can be found at [/src/server/src/sbvr-api/user.sbvr](../src/server/src/sbvr-api/user.sbvr)

### Exposing the OData API
To expose the user model over the OData API use the following in the custom server code:
```javascript
app.get('/Auth/*', sbvrUtils.runGet)
```
This will allow you to access the user model under the `/Auth` entry point as you would any other model, eg `GET /Auth/user`

Alternatively you can copy the user model vocab into your SBVR file, which will expose it under the same entry point as your vocabulary, the benefit to this is that you can add custom attributes for the user vocab to your vocab and have them be accessible via the API.

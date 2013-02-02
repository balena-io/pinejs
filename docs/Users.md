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
All users (including ones who are not logged in) automatically gain any permissions assigned to the account named 'guest'.
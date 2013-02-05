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
```text
Vocabulary: Auth
Term:       username
	Concept Type: Short Text (Type)
Term:       password
	Concept Type: Hashed (Type)
Term:       name
	Concept Type: Short Text (Type)

Term:       permission
	Reference Scheme: name
Fact type:  permission has name
	Necessity: Each permission has exactly one name.
	Necessity: Each name is of exactly one permission.

Term:       role
	Reference Scheme: name
Fact type:  role has name
	Necessity: Each role has exactly one name.
	Necessity: Each name is of exactly one role.
Fact type:  role has permission

Term:       user
	Reference Scheme: username
Fact type:  user has username
	Necessity: Each user has exactly one username.
	Necessity: Each username is of exactly one user.
Fact type:  user has password
	Necessity: Each user has exactly one password.
Fact type:  user has role
	Note: A 'user' will inherit all the 'permissions' that the 'role' has.
Fact type:  user has permission
```
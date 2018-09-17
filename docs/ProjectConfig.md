# Configuring A Project

The project configuration is placed inside `config.json` that provides all the necessary information to Pine.js regarding the models, the API, and the users. This file should follow a specification based on the example shown below:

```
{
	"models": [{
		"modelName": "Example",
		"modelFile": "example.sbvr",
		"apiRoot": "example",
		"customServerCode": "example.coffee",
		"logging": {
			"log": false,
			"error": true,
			"default": false
		}
	}],
	"users": [{
		"username": "guest",
		"password": " ",
		"permissions": [
			"resource.all"
		]
	}]
}
```

## Models
The `models` object contains the following fields:

* `modelName` - This field is required. The string value is used in messages about whether the model passes/fails.
* `modelFile` - This field is required. It is pointing to the file that contains the sbvr model. In this example, it's the `example.sbvr` inside the same directory.
* `apiRoot` - This field is required. It defines the root path to access the model's API. In this example, it's `/example/{OData URL}`.
* `customServerCode` - This field is optional and it's a string pointing to a file (`.coffee` or `.js`) that will be run by the server on startup.
* `logging` - This field is optional. This is an object of `true`/`false` values for whether calls to console[key] should be output, with the special `default` value being used for any unspecified keys (defaults to `true`).

## User System & Permissions
Permissions currently work by having a name which defines what the permission covers. The formats for this are as follows:

* `resource.{action}` - Grants the permission for `{action}` on all resources.
* `{vocabulary}.{action}` - Grants the permission for `{action}` on all resources of `{vocabulary}`.
* `{vocabulary}.{resource}.{action}` - Grants the permission for `{action}` on the `{resource}` of `{vocabulary}`.

### Actions

* `model` - Used for accessing the model alone for a resource
* `get` - Used for getting records of a resource (model is included when fetching records)
* `read` - Same as `get`
* `create` - Used for creating records of a resource
* `update` - Used for updating records of a resource
* `set` - Used for setting records of a resource. Action `set` is actually `create` + `update`
* `delete` - Used to deleting records of a resource

### Special Variables

* `@__ACTOR_ID` - This is replaced by the `id` of the currently logged in actor (or `0` if not logged in), or the actor who owns the API key in use.

### Default/Guest User Permissions
All users (including ones who are not logged in) automatically gain any permissions assigned to the account named "guest". You can create this user in the `config.json` as shown in the example above.

### Model
The SBVR model for users can be found at [/src/sbvr-api/user.sbvr](https://github.com/resin-io/pinejs/blob/master/src/sbvr-api/user.sbvr)

### Exposing the OData API
To expose the user model over the OData API, use the following in your custom server code:

```
app.get('/Auth/*', sbvrUtils.runGet)
```
This will allow you to access the user model under the `/Auth` entry point as you would any other model, e.g. `GET /Auth/user`.

Alternatively, you can copy the user model vocabulary into your SBVR file, which will expose it under the same entry point as your vocabulary. The benefit to this is that you can add custom attributes for the user vocabulary to your vocabulary and have them be accessible via the API.


## Database
You can specify your database url in an environment variable called DATABASE_URL, refer to your OS documentation on how to do this (either on a global level for all programs, or just set it temporarily whilst launching your project).

If you do not specify this environment variable, then the defaults are as follows:

MySQL:

```coffee
	host: 'localhost'
	user: 'root'
	password: '.'
	database: 'rulemotion'
```

PostgresSQL:

```coffee
	postgres://postgres:.@localhost:5432/postgres
```

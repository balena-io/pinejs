# Creating A Project

## Requirements
* [node.js](http://nodejs.org/) >= 0.8.18
* [require.js](http://requirejs.org/) >= 2.1.4 (aka `npm install requirejs -g`)
* [node-bcrypt dependencies](https://github.com/ncb000gt/node.bcrypt.js/#dependencies)
* [PostgreSQL](http://www.postgresql.org/) >= 8.3 or [MySQL](http://www.mysql.com/) >= 5.5

## Setting Up A Project

1. Check out (or update your copy of) `rulemotion-canvas/master` (all paths used below will be relative to this working director unless otherwise specified)
2. Navigate to `src/server/build`
3. Edit server.build.js to enable/disable `USE_MYSQL` and `USE_POSTGRES` depending on your target database.
4. Run `r.js -o server.build.js` on Linux/Mac OSX or `r.js.cmd -o server.build.js` on Windows.
5. Copy the `src/server/build/platform.js` file that was just created into your project's folder/repository.
6. Copy `src/server/package.json` file into your project's folder/repository.
7. Run `npm install` in your project's folder/repository.
8. [Configure your project](#configuring-a-project)
9. Run `node platform.js` (This will create the schema including users)
10. Set up a guest user (see [Users documentation](https://bitbucket.org/rulemotion/rulemotion-canvas/src/master/docs/Users.md)).
11. Re-run `node platform.js`.

## Updating the platform
Follow steps 1-5 of [Setting Up A Project](#setting-up-a-project) and then run `node platform.js`

## Configuring A Project
### config.json
This file should be located alongside your `platform.js` file, and follow the specification below (with comments removed)
```javascript
{
	"models": [{
		"modelName": "Example",
		"modelFile": "example.sbvr",
		"apiRoot": "example",
		"customServerCode": "example.coffee"
	}]
}
```

#### models
##### Required: modelName
This is a string used in messages about whether the model passes/fails.

##### Required: modelFile
This is a string pointing to the file that contains the sbvr model, relative to `platform.js` (extension does not matter)

##### Required: apiRoot
This is a string that defines the root path to access this model's API, eg. /example/{OData URL}

##### Optional: customServerCode
This is a string pointing to a file (`.coffee` or `.js`), relative to `platform.js`, that will be loaded by the server, and should export a function with the following signature:  
`setup(app, requirejs, sbvrUtils, db)`

This function will be called whilst the server starts up and can be used to add custom server code for your project.  
app: An [express.js](http://expressjs.com/) app instance, can be used to add your own routes.  
requirejs: The requirejs object used by the platform, can be used to include files  
sbvrUtils: An entry point to the API internally to the server - to be documented further in future, for now the runURI function is your friend.  
db: An object that allows direct connection to the database, which largely follows the WebSQL interface (with slight modifications) - to be documented further in future.


### Database
You can specify your database url in an environment variable called DATABASE_URL, refer to your OS documentation on how to do this (either on a global level for all programs, or just set it temporarily whilst launching your project).  
If you do not specify this environment variable, then the defaults are as follows:  
MySQL
```text
	host: 'localhost'
	user: 'root'
	password: '.'
	database: 'rulemotion'
```
PostgresSQL:
```text
	postgres://postgres:.@localhost:5432/postgres
```

### static dir
Any files placed in a dir named static in the same folder as `platform.js` will be served as static files.
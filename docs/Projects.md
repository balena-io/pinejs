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
		"modelName": "Example", // Required: This is used in messages about whether the model passes/fails
		"modelFile": "example.sbvr", // Required: This is the file that contains the sbvr model (extension does not matter)
		"apiRoot": "example", // Required: The root api entry point, so you would access the api with /example/{OData URL}
		"customServerCode": "example.coffee" // Optional: This file will be required in and the exported function `setup(app, requirejs, sbvrUtils, db)` will be called, useful if you need some custom server code for your project (can also be a .js file).
	}]
}
```

### Database
You can specify your database url in an environment variable called DATABASE_URL, refer to your OS documentation on how to do this (either on a global level, or just for launching a specific project).  
If you do not specify this environment variable however, then the defaults are as follows:  
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
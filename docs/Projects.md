# Creating A Project

## Setting Up A Project
First step in creating a project, is to have a build of the platform.

1. Check out (or update your copy of) rulemotion-canvas/master
2. Run `npm install requirejs -g` (this installs requirejs globally, so where you run it does not matter)
3. Navigate to `src/server/build` within your working copy
4. Edit server.build.js to enable/disable `USE_MYSQL` and `USE_POSTGRES` depending on your target database.
4. Run `r.js -o server.build.js` on Linux/Mac OSX or `r.js.cmd -o server.build.js` on Windows.
5. Copy the platform.js file that was just created in `src/server/build` into your project folder/repository.
6. [Configure your project](#configuring-a-project)
7. Run `node platform.js` (This will create the schema including users)
8. Setup a guest user (see Users documentation).
9. Restart platform.

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
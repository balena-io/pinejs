# Creating A Project

## Setting Up A Project
First step in creating a project, is to have a build of the platform.

1. Check out rulemotion-canvas/master
2. Run `npm install requirejs -g`
3. Navigate to src/server/build
4. Edit server.build.js to enable/disable `USE_MYSQL` and `USE_POSTGRES` depending on your target database.
4. Run `r.js -o server.build.js` on Linux/Mac OSX or `r.js.cmd server.build.js` on Windows.
5. Copy platform.js into your project folder/repository.
6. Configure your project.
7. Run `node platform.js`

## Configuring A Project
### config.json
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

### static dir
Any files placed in a dir named static in the same folder as `platform.js` will be served as static files.
# Data Validation

## Requirements
* [node.js](http://nodejs.org/) >= 0.8.18
* [require.js](http://requirejs.org/) >= 2.1.4 (aka `npm install requirejs -g`)
* [node-bcrypt dependencies](https://github.com/ncb000gt/node.bcrypt.js/#dependencies)
* [PostgreSQL](http://www.postgresql.org/) >= 8.3 or [MySQL](http://www.mysql.com/) >= 5.5

## Developing
To run in development mode:
1. Check out (or update your copy of) `rulemotion-canvas/master` (all paths used below will be relative to this working director unless otherwise specified)
2. Run a local static fileserver that is no deeper than the `rulemotion-canvas/src` directory.
3. Open `src/client/src/index.html` on your localhost (adjust the start of the path to match your server's config)

## Building

### Node.js Server
1. Check out (or update your copy of) `rulemotion-canvas/master` (all paths used below will be relative to this working director unless otherwise specified)
2. Navigate to `src/client/build`
3. Run `r.js -o client.build.js` on Linux/Mac OSX or `r.js.cmd -o client.build.js` on Windows.
4. Copy the files in the `src/client/out` directory that was created into your project's static directory, for help there see: [Setting Up A Project](https://bitbucket.org/rulemotion/rulemotion-canvas/src/master/docs/Projects.md#setting-up-a-project).
5. Run your project.

### Browser (Chrome) Server
1. Check out (or update your copy of) `rulemotion-canvas/master` (all paths used below will be relative to this working director unless otherwise specified)
2. Navigate to `src/client/build`
3. Run `r.js -o client-server.build.js` on Linux/Mac OSX or `r.js.cmd -o client-server.build.js` on Windows.
4. To run locally, open the `src/client/out/index.html` file that was created.
5. To deploy, just deploy the out folder using the static fileserver of your choice.
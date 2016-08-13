# Building from Source

Pine.js can be distributed as a single javascript file
typically named `pine.js` which contains aggregated code capable of reading an SBVR file and generating an API. Configuration is read from `config.json` in the same directory as `pine.js` and described further in [project configuration document][project-config].

## Requirements
* [node.js](https://nodejs.org) >= 0.8.18
* [require.js](http://requirejs.org) >= 2.1.4 (`npm install -g requirejs`)
* [node-bcrypt dependencies](https://github.com/ncb000gt/node.bcrypt.js/#dependencies)

The required steps to build Pine.js are:

1. Check out (or update your copy of) `pinejs/master` (all paths below will be relative to this working directory unless otherwise specified).
2. Run `bower install` in the root of pinejs.
3. Run `npm install` in the root of pinejs.
4. Run `./node_modules/.bin/grunt $TYPE -o server.build.js` on Linux/Mac OSX or `node_modules\.bin\grunt $TYPE` on Windows, where `$TYPE` is `server` or `module`.

Pine.js used to be copied to other projects as a single built file. This is no longer required, since it is a proper npm module. So, if you want to start a project with Pine.js you just need to include it as a dependency in your package.json:

```
"dependencies": {
    "@resin/pinejs": "^2.0.0",
```


## Example Application

The [Pine.js Example Application][pine-example] is the best means of getting up to speed with Pine.js and the [Pine.js API][pinejs-client-js] (a library for interacting with Pine.js simply from the frontend) - it contains an end-to-end working 'ToDo' web application.


[docs]:.
[pine-example]:https://github.com/resin-io/pine-example
[pinejs-client-js]:https://github.com/resin-io/pinejs-client-js
[project-config]:ProjectConfig.md
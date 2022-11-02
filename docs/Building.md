# Building from Source

Pine.js can be distributed as a single JavaScript file typically named `pine.js`, which contains aggregated code capable of reading an SBVR file and generating an API.
Configuration is read from `config.json` in the same directory as `pine.js` and described further in [project configuration document][project-config].

## Requirements
* [node.js](https://nodejs.org) >= 12.0.0
* [node-bcrypt dependencies](https://github.com/ncb000gt/node.bcrypt.js/#dependencies)

The required steps to build Pine.js are:

1. Check out (or update your copy of) `pinejs/master` (all paths below will be relative to this working directory unless otherwise specified).
2. Run `npm install` in the root of pinejs.
3. Run the desired build script, output stored in the `/out` directory
    - `npm run webpack-browser` to build the browser component
    - `npm run webpack-module` to build the module component
    - `npm run webpack-server` to build the server component

Pine.js used to be copied to other projects as a single built file.
This is no longer required as it is a proper npm module.
If you want to start a project with Pine.js you just need to include it as a dependency in your package.json:

```sh
npm i @balena/pinejs
```

## Contributors

You can use `grunt` to build the project when working directly on Pine.js, this is useful to test some changes locally before submitting a PR.
If you are using pine bundled into a single js file, you can simply run step 4 from the build again to obtain the new file.
The entry-point for the npm module is located at `out/server-glue/module.js`, you can test your local changes by running `grunt build`, which will build all files in the `src/` folder and copy the output to `out/`.
You can also specify a different target folder in which to build Pine.js via the following command `grunt build --target=path-to-your-pinejs-dependency/out`.

[docs]:.
[pinejs-client-js]:https://github.com/balena-io-modules/pinejs-client-js
[project-config]:ProjectConfig.md

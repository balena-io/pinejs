# Building from Source

The [Projects documentation page][projects-doc] gives detailed instructions on
building Pine.js from source. Pine.js is distributed as a single javascript file
typically named `pine.js` which contains aggregated code capable of reading
an SBVR file and generating an API. Configuration is read from `config.json` in
the same directory as `pine.js` and described further in the aforementioned
project doc.

Note that you must have PostgreSQL up and running before attempting to build
from source and then must run `bower install` before `npm install`. At the time
of writing `npm install` generates `pine.js` for you as a post-install hook.

Pine.js used to be copied to other projects as a single built file. This is no longer
required, since it is a proper npm module. So, if you want to start a project with Pine.js
you just need to include it as a dependency in your package.json:

```
"dependencies": {
    "@resin/pinejs": "~0.6.3",
```


## Example Application

The [Pine.js Example Application][pine-example] is the best means of getting up
to speed with Pine.js and the [Pine.js API][pinejs-client-js] (a
library for interacting with Pine.js simply from the frontend) - it contains an
end-to-end working 'ToDo' web application.


[docs]:.
[pine-example]:https://bitbucket.org/rulemotion/pine-example
[pinejs-client-js]:https://github.com/resin-io/pinejs-client-js
[projects-doc]:Projects.md

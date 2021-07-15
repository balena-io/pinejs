# Getting Started with Pine.js

This guide assumes that you have already read the main [README](https://github.com/balena-io/pinejs/blob/master/README.md) file of this repo and you have understood the main concepts of Pine.js.

## Initialize an example application

Let's create a new Pine.js application. We will see that by defining our model rules in SBVR format, Pine.js will create the database schema and will provide out of the box an OData API, ready to use to interact with our database and resources.

To begin with, you'll need to install PostgreSQL on your system, and configure a database and a user with read/write/metadata permissions on the database. In this guide, we will use `example` as the database name and `exampler` as the user name. Open your favorite terminal and type the following commands:

```
$ createuser -W exampler
$ createdb example -O exampler
```

The above commands will create a user with name `exampler` and will prompt for a password, and then will set `exampler` as the database owner. You can also use your favorite tool to achieve the same result, such as pgAdmin.

Next you'll need to install Pine.js as a dependency of your application. Go to a new directory that will use for your application. Let's say `pine-get-started` and type:

```
$ npm init
```

Feel free to enter any information you like for your application when prompted, like application name, version, description, etc. The above command will initialize your application by creating the `package.json` file.

```
$ npm install --save @balena/pinejs
```

The above commands will install pinejs as a dependency for your application, i.e. it will create the node_modules directory that amongst others will contain Pine.js, and will update the corresponding record in your `package.json` file.

Let's see what your directory looks like now:

```
$ tree -L 3
.
├── node_modules
│   └── @balena
│       └── pinejs
└── package.json
```

Now, create a directory for our source files, `src` and enter that directory.

First, we have to create a configuration file, `config.json` that will provide to Pine.js the necessary configuration regarding the resource model and the user permissions. Open your favorite editor and type the following into the `config.json` file:

```
{
	"models": [{
			  "modelName": "Example",
			  "modelFile": "example.sbvr",
			  "apiRoot": "example"
	}],
	"users": [{
			 "username": "guest",
			 "password": " ",
			 "permissions": [ "resource.all" ]
	}]
}
```

The above file states that Pine.js has to use the file `example.sbvr` to find the model definitions, and `/example` as the root path to access the model's API. You can read more about project configuration in [ProjectConfig](https://github.com/balena-io/pinejs/blob/master/docs/ProjectConfig.md).

Now, let's create the models. Again in your favorite editor, type the following in the `example.sbvr` file and save it under `src` folder.

```
Vocabulary: example

Term: name
	  Concept Type: Short Text (Type)

Term: note
	  Concept Type: Text (Type)

Term: type
	  Concept Type: Short Text (Type)

Term: device

Fact Type: device has name
	 Necessity: each device has at most one name.

Fact Type: device has note
	 Necessity: each device has at most one note.

Fact Type: device has type
	 Necessity: each device has exactly one type.
```

In this model we are defining an entity called `device`, this entity has some attributes such as `name`, `note` and `type`, along with some constraints, ensuring that a device must have exactly one device type, and at most one name and one note. The `Vocabulary` declaration is a convenient way for partitioning parts of larger sbvr files.

Now, let's create a small main file for our application that will call the Pine.js server. Let's install some basic dependencies:

```
$ npm install --save coffeescript
$ npm install --save express
$ npm install --save body-parser
```

And inside your `src` folder, create a file `app.coffee` with the following content:

```
pinejs = require '@balena/pinejs'
express = require 'express'
app = express()

bodyParser = require 'body-parser'
app.use(bodyParser())


app.use (req, res, next) ->
	console.log('%s %s', req.method, req.url)
	next()

pinejs.init(app)
.then ->
	app.listen process.env.PORT or 1337, ->
		console.info('Server started')
```


Finally, inside your `package.json` file enter the following line inside the section `scripts`:

```
"start": "./node_modules/.bin/coffee src/app.coffee src"
```

Let's see what our application directory looks like now:

```
$ tree -L 3
.
├── node_modules
│   ├── @balena
│   │   └── pinejs
│   ├── body-parser
│   │   ├── HISTORY.md
│   │   ├── LICENSE
│   │   ├── README.md
│   │   ├── index.js
│   │   ├── lib
│   │   ├── node_modules
│   │   └── package.json
│   ├── coffeescript
│   │   ├── CNAME
│   │   ├── CONTRIBUTING.md
│   │   ├── LICENSE
│   │   ├── README.md
│   │   ├── bin
│   │   ├── bower.json
│   │   ├── lib
│   │   ├── package.json
│   │   ├── register.js
│   │   └── repl.js
│   ├── express
│   │   ├── History.md
│   │   ├── LICENSE
│   │   ├── Readme.md
│   │   ├── index.js
│   │   ├── lib
│   │   ├── node_modules
│   │   └── package.json
├── package.json
└── src
    ├── app.coffee
    ├── config.json
    └── example.sbvr
```

### Start the server

Assuming postgreSQL is running, execute the following command, replacing `[your_password]` with the password you set for the user `exampler`.

```
$ DATABASE_URL=postgres://exampler:[your_password]@localhost:5432/example npm start
```

Pine.js will connect to the `example` database and it will create the database schema and the associated API endpoints. Once the server is up, use your favourite tool, such as pgAdmin, to connect to the database and take a look inside. Among the other things, you will find that Pine.js has created a table called `device`, which will contain the devices we earlier specified in the model. By inspecting the structure of this table, you can see that the constraints specified in sbvr model get directly translated to constraints in the underlying database.

Pine.js also generates users and permissions; the database will contain a `guest` user with access to all resources, these entities are created internally by Pine.js from the config file we provided.

## Accessing Resources

Now that the server is up and running we are able to create, delete or update entities from the specified model. Recall that Pine.js provides access to the database through the associated [OData API](http://www.odata.org), this means that we can make requests to the database following the OData specification to manage our model.

We will use cURL to make these requests, so open up another terminal window and place it side by side to the one running the server.

First of all we need to create a device. To do so type the following in the new window:

```
$ curl -X POST -d name=testdevice -d note=testnote -d type=raspberry http://localhost:1337/example/device
```

If the creation succeeds the server will respond with an object representing the new entity, in this case it will look something like this:

```json
{"id":1,"name":"testdevice","note":"testnote","type":"raspberry","__metadata":{"uri":"/example/device(2)","type":""}}
```

Aside from `__metadata` which is used internally, the properties of this object match the attributes of the `device` table; if you go and take a look at that table again, you will find the new entry inserted with these attributes.

If we ask the server for a list of devices we will see the one we just created:

```
$ curl -X GET http://localhost:1337/example/device
```

The server will respond with an array containing all the devices, if we want to access a specific one, it is sufficient to add the id at the end of the URL we pass.

```
$ curl -X GET 'http://localhost:1337/example/device(1)'
```

The above cURL request will return the single entity with `id=1`.

To modify the device we just created: the OData specification tells us that to do so we can make a `PUT` request to the endpoint that represents the entity.
Lets try this:

```
$ curl -X PUT -d name=testdevice -d note=updatednote 'http://localhost:1337/example/device(1)'

***
Internal Server Error
```

What went wrong here? Pine.js is simply preventing us from violating the constraints we had previously defined. One of these was that each device has exactly one type, but in the request we forgot about this; luckily Pine.js can catch these kind of mistakes and will reject the update.

To correctly modify the device we can try:

```
$ curl -X PUT -d name=testdevice -d note=updatednote -d type=raspberry 'http://localhost:1337/example/device(1)'
```

You can now try to delete this entity to restore the database to it’s initial state. Recall from the OData specification that this can be done by performing a DELETE request at the endpoint represented by the entity we intend to delete.

### Where to go from here:
* Follow the [advanced usage guide](./AdvancedUsage.md) that builds on top of this example to add some custom validation via hooks
* Learn about migrations that you can execute prior to Pine.js executing a given sbvr model: [Migrations.md](https://github.com/balena-io/pinejs/blob/master/docs/Migrations.md)
* Learn about [Hooks](https://github.com/balena-io/pinejs/blob/master/docs/Hooks.md) that you can implement in order to execute custom code when API calls are requested.

`
if(typeof ENV_NODEJS === 'undefined') ENV_NODEJS = typeof process !== 'undefined';
if(typeof SBVR_SERVER_ENABLED === 'undefined') SBVR_SERVER_ENABLED = true;
if(typeof EDITOR_SERVER_ENABLED === 'undefined') EDITOR_SERVER_ENABLED = true;
if(typeof BROWSER_SERVER_ENABLED === 'undefined') BROWSER_SERVER_ENABLED = !ENV_NODEJS;
if(typeof DEV === 'undefined') DEV = true;
`

if ENV_NODEJS
	databaseOptions =
		engine: 'mysql'
		params:
			host: 'localhost'
			user: 'root'
			password: '.'
			database: 'rulemotion'
	# databaseOptions =
		# engine: 'postgres'
		# params: process.env.DATABASE_URL || "postgres://postgres:.@localhost:5432/postgres"
else
	databaseOptions =
		engine: 'websql'
		params: 'rulemotion'
		

setupCallback = (requirejs, app) ->
	requirejs(['server-glue/sbvr-utils', 'passportBCrypt'], (sbvrUtils, passportBCrypt) ->
		sbvrUtils.setup(app, requirejs, databaseOptions)
		passportBCrypt = passportBCrypt({
				loginUrl: '/login',
				failureRedirect: '/login.html',
				successRedirect: '/'
			}, sbvrUtils, app, passport)
		
		if SBVR_SERVER_ENABLED
			requirejs(['data-server/SBVRServer'], (sbvrServer) ->
				sbvrServer.setup(app, requirejs, sbvrUtils, passportBCrypt.isAuthed, databaseOptions)
			)

		if EDITOR_SERVER_ENABLED
			requirejs(['editor-server/editorServer'], (editorServer) ->
				editorServer.setup(app, requirejs, sbvrUtils, passportBCrypt.isAuthed, databaseOptions)
			)
	)

	if ENV_NODEJS
		app.listen(process.env.PORT or 1337, () ->
			console.log('Server started')
		)



if ENV_NODEJS
	requirejs = require('requirejs')
	buildType = ''
	if DEV
		rootPath = process.cwd() + '/../../../../'
		currentPathParts = process.cwd().split(require('path').sep)
		buildType = '/' + currentPathParts.pop()
		if buildType != '/src'
			buildType = '/' + currentPathParts.pop() + buildType
	else
		rootPath = process.cwd() + '/../../'
	requirejs.config(
		paths: {
			'jquery':					rootPath + 'external/jquery-1.7.1.min',
			# 'jquery':					'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min',
			'jquery-ui':				rootPath + 'external/jquery-ui/js/jquery-ui-1.8.17.custom.min',
			'jquery-custom-file-input':	rootPath + 'external/jquery-custom-file-input',
			'jquery.hotkeys':			rootPath + 'external/jquery.hotkeys',
			'ometa-core':				rootPath + 'external/ometa-js/lib/ometajs/core',
			'ometa-compiler':			rootPath + 'external/ometa-js/lib/ometajs/ometa/parsers',
			'codemirror':				rootPath + 'external/CodeMirror2/lib/codemirror',
			'codemirror-util':			rootPath + 'external/CodeMirror2/lib/util',
			'codemirror-keymap':		rootPath + 'external/CodeMirror2/keymap',
			'codemirror-modes':			rootPath + 'external/CodeMirror2/mode',
			'js-beautify':				rootPath + 'external/beautify/beautify',
			'qunit':					rootPath + 'external/qunit/qunit',
			'underscore':				rootPath + 'external/underscore-1.2.1.min',
			'inflection':				rootPath + 'external/inflection/inflection',
			'json2':					rootPath + 'external/json2',
			'downloadify':				rootPath + 'external/downloadify',
			'ejs':						rootPath + 'external/ejs/ejs.min',
			
			'sbvr-parser':				rootPath + 'common/sbvr-parser' + buildType,
			'utils':					rootPath + 'common/utils' + buildType,
			
			'sbvr-frame':				rootPath + 'client/sbvr-frame' + buildType,
			'data-frame':				rootPath + 'client/data-frame' + buildType,
			'Prettify':					rootPath + 'client/prettify-ometa' + buildType + '/Prettify',
			'codemirror-ometa-bridge':	rootPath + 'client/codemirror-ometa-bridge' + buildType,
			
			'sbvr-compiler':			rootPath + 'server/sbvr-compiler' + buildType,
			
			'server-glue':				rootPath + 'server/server-glue' + buildType,
			'express-emulator':			rootPath + 'server/express-emulator' + buildType,
			'data-server':				rootPath + 'server/data-server' + buildType,
			'editor-server':			rootPath + 'server/editor-server' + buildType,
			'database-layer':			rootPath + 'server/database-layer' + buildType,
			'passportBCrypt':			rootPath + 'server/passport-bcrypt' + buildType + '/passportBCrypt',
			
			'frame-glue':				rootPath + 'client/frame-glue' + buildType
		}
		nodeRequire: require
		baseUrl: 'js'
	)
	
	express = require('express')
	app = express.createServer()
	passport = require('passport')
	
	app.configure(->
		app.use(express.cookieParser())
		app.use(express.bodyParser())
		app.use(express.session({ secret: "A pink cat jumped over a rainbow" }))
		app.use(passport.initialize())
		app.use(passport.session())
		app.use(express.static(rootPath))
	)
	
	setupCallback(requirejs, app)
else
	requirejs = window.requirejs
	if BROWSER_SERVER_ENABLED
		requirejs(['express-emulator/express'], (express) ->
			window?.remoteServerRequest = express.app.process
			setupCallback(requirejs, express.app)
		)

# fs = require('fs')
# lazy = require("lazy")
# imported = 0
# new lazy(fs.createReadStream(process.argv[2])).lines.forEach((query) ->
	# query = query.toString().trim()
	# if query.length > 0
		# _db.run query, (error) ->
			# if error
				# console.log error, imported++
			# else
				# console.log "Import Success", imported++
# )

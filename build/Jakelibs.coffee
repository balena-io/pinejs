fs = require('fs')
path = require('path')

process.env.outputDir ?= 'out/'
process.env.compiledDir ?= process.env.outputDir + 'compiled/'
process.env.processedDir ?= process.env.outputDir + 'processed/'
process.env.finalDir ?= process.env.outputDir + 'publish/'

defines = {}

setDefines = (newDefines) ->
	for key, value of newDefines
		defines[key] = do(value) ->
			if typeof value == "string"
				return [ "string", value ]
			if typeof value == "number"
				return [ "num", value ]
			if value == true
				return [ 'name', 'true' ]
			if value == false
				return [ 'name', 'false' ]
			if value == null
				return [ 'name', 'null' ]
			if value == undefined
				return [ 'name', 'undefined' ]
			throw "Can't understand the specified value: " + value

setDefines(
	DDUI_ENABLED: true
	BROWSER_SERVER_ENABLED: true
	SBVR_SERVER_ENABLED: true
	EDITOR_SERVER_ENABLED: true
	ENV_NODEJS: false
)

currentCategory = ''
currentModule = ''
currentDirs = {}
setDirs = (category, module) ->
	removeTrailingSlash = (s) -> s.replace(/[/\\]*$/, '')
	currentCategory = category
	currentModule = module
	rootDir = removeTrailingSlash(path.join('src', currentCategory, currentModule))
	currentDirs =
		root: rootDir
		src: removeTrailingSlash(path.join(rootDir, 'src'))
		output: removeTrailingSlash(path.join(rootDir, process.env.outputDir))
		compiled: removeTrailingSlash(path.join(rootDir, process.env.compiledDir))
		processed: removeTrailingSlash(path.join(rootDir, process.env.processedDir))
		final: removeTrailingSlash(path.join(rootDir, process.env.finalDir))

do ->
	process.chdir('..')
	cwd = process.cwd()
	if fs.existsSync(path.resolve(path.join(cwd, '../../../build/Jakefile.coffee')))
		module = path.basename(cwd)
		category = path.basename(path.dirname(cwd))
		setDirs(category, module)
		process.chdir('../../..')
	else
		setDirs('', '')

uglify = require('uglify-js')
ometa = require('../src/common/ometa-compiler/src/ometac.coffee')
coffee = require('coffee-script')
exec = require('child_process').exec
requirejs = require('requirejs')

jake.rmutils ?= {}
jake.rmutils.setDefines = setDefines
jake.rmutils.getCurrentNamespace = getCurrentNamespace = () ->
	fullNamespace = ''
	currNamespace = jake.currentNamespace
	while currNamespace.parentNamespace?
		fullNamespace = currNamespace.name + ':' + fullNamespace
		currNamespace = currNamespace.parentNamespace
	return fullNamespace

jake.rmutils.excludeNonDirs = excludeNonDirs = (name) -> # Exclude non-directories
	try
		stats = fs.statSync(name)
		return !stats.isDirectory()
	catch e
		console.error(e)
		return true

jake.rmutils.alterFileTask = alterFileTask = (outFile, inFile, taskDependencies, alterFunc) ->
	if alterFunc == undefined
		alterFunc = taskDependencies
		taskDependencies = []
	taskDependencies.push(inFile)
	file(outFile, taskDependencies,
		-> 
			task = this
			data = fs.readFile(inFile, 'utf8', (err, data) ->
				if err
					fail(err)
				else
					alterFunc.call(task, data, (err, data) ->
						if err
							fail(err)
						else
							console.log('Writing to: ', outFile)
							fs.writeFile(outFile, data, (err) ->
								if err
									fail(err)
								else
									complete()
							)
					)
			)
		async: true
	)

jake.rmutils.excludeDirs = excludeDirs = [process.env.outputDir, '.git', 'node_modules', 'build']

jake.rmutils.importJakefile = (category, module) ->
	jakefile = path.resolve(path.join('src', category, module, 'build', 'Jakefile.coffee'))
	if fs.existsSync(jakefile)
		setDirs(category, module)
		require(jakefile)
		return true
	return false

createDirectoryTasks = () ->
	taskList = []
	namespace('dir', ->
		folderList = new jake.FileList()
		folderList.clearExclude() # Clear the default exclude of folders
		folderList.include(path.join(currentDirs.src, '**'))
		folderList.exclude(excludeDirs)
		folderList.exclude(excludeNonDirs)
		
		dirList = [currentDirs.compiled, currentDirs.processed, currentDirs.final]
		for folderPath in folderList.toArray()
			# We want to keep the output dir paths relative to the src dir paths
			folderPath = path.relative(currentDirs.src, folderPath)
			dirList.push(path.join(currentDirs.compiled, folderPath), path.join(currentDirs.processed, folderPath), path.join(currentDirs.final, folderPath))
		
		currNamespace = getCurrentNamespace()
		directory(currentDirs.output)
		taskList.push(currNamespace + currentDirs.output)
		for dirTask in dirList
			directory(dirTask, [currNamespace + path.dirname(dirTask)])
			taskList.push(currNamespace + dirTask)
		
		desc('Create all output directories.')
		task('all', taskList)
	)
	return taskList

createInstallTasks = () ->
	if fs.existsSync(path.join(currentDirs.src, 'package.json'))
		compiledDir = currentDirs.compiled
		desc('Install npm dependencies')
		task('install',
			->
				exec('npm install', {cwd: compiledDir}, (err, stdout, stderr) ->
					console.log(stdout)
					console.error(stderr)
					if err
						fail()
					else
						complete()
				)
			async: true
		)
		return [getCurrentNamespace() + 'install']
	return []

jake.rmutils.boilerplate = (compileCopyTasks) ->
	directoryTasks = createDirectoryTasks()
	installTasks = createInstallTasks()

	desc('Compile all of this module')
	task('all', directoryTasks.concat(compileCopyTasks, installTasks))

	jake.rmutils.boilerplate.cleanTaskList.push(getCurrentNamespace() + 'clean')
	outputDir = currentDirs.output
	desc('Clean up created files')
	task('clean', ->
		jake.rmRf(outputDir)
	)
jake.rmutils.boilerplate.cleanTaskList = []

createCompileNamespace = (action, fileType, createCompileTaskFunc) ->
	taskList = []
	namespace(fileType, ->
		currNamespace = getCurrentNamespace()
		fileList = new jake.FileList()
		fileList.exclude(excludeDirs)
		fileList.include(path.join(currentDirs.src, '**', '*.' + fileType))
		for srcFile in fileList.toArray()
			taskList = taskList.concat(createCompileTaskFunc(srcFile))
		desc(action + ' all ' + fileType + ' files for ' + [currentCategory, currentModule].join(':') + '.')
		task('all', taskList)
	)
	return taskList

getCompiledFilePaths = (srcFile, newExt) ->
	srcFile = path.relative(currentDirs.src, srcFile)
	extFile = srcFile
	if newExt?
		extFile = path.join(path.dirname(extFile), path.basename(extFile, path.extname(extFile)) + newExt)
	compiledFile = path.join(currentDirs.compiled, extFile)
	processedFile = path.join(currentDirs.processed, extFile)
	return {compiledFile, processedFile}

uglifyDefines = (data, callback) ->
		ast = uglify.parser.parse(data)
		ast = uglify.uglify.ast_mangle(ast,
			mangle: false
			defines: defines
		)
		ast = uglify.uglify.ast_squeeze(ast,
			make_seqs: false
			dead_code: true
		)
		code = uglify.uglify.gen_code(ast,
			beautify: true
		)
		callback(false, code)

jake.rmutils.ometaCompileNamespace = () ->
	return createCompileNamespace('Compile', 'ometa', (srcFile) ->
		{compiledFile, processedFile} = getCompiledFilePaths(srcFile, '.js')
		desc('Compile ' + srcFile)
		file(compiledFile,
			->
				ometa.compileOmetaFile(srcFile, compiledFile, true, (err) ->
					if err
						fail()
					else
						complete()
				)
			async: true
		)
		desc('Process ' + srcFile)
		alterFileTask(processedFile, compiledFile, uglifyDefines)
		currNamespace = getCurrentNamespace()
		return [currNamespace + compiledFile, currNamespace + processedFile]
	)

jake.rmutils.coffeeCompileNamespace = () ->
	return createCompileNamespace('Compile', 'coffee', (srcFile) ->
		{compiledFile, processedFile} = getCompiledFilePaths(srcFile, '.js')
		desc('Compile ' + srcFile)
		alterFileTask(compiledFile, srcFile,
			(data, callback) ->
				console.log('Compiling CoffeeScript for: '+ this.name)
				try
					callback(false, coffee.compile(data))
				catch e
					callback(e)
		)
		desc('Process ' + srcFile)
		alterFileTask(processedFile, compiledFile, uglifyDefines)
		currNamespace = getCurrentNamespace()
		return [currNamespace + compiledFile, currNamespace + processedFile]
	)

createCopyTask = (srcFile) ->
	{compiledFile, processedFile} = getCompiledFilePaths(srcFile)
	copyCallback = (data, callback) ->
		console.log('Copying file for: '+ this.name)
		callback(false, data)
	
	desc('Copy ' + path.basename(srcFile))
	alterFileTask(compiledFile, srcFile, copyCallback)
	if path.extname(srcFile) == '.html'
		desc('Process ifdefs for ' + path.basename(compiledFile))
		alterFunc = (data, callback) -> 
			regexpDefines = (define for define, value of defines when value).join('|')
			console.log('Processing HTML IFDEFs for: '+ this.name)
			data = data.replace(new RegExp('<!--[^>]*?#IFDEF[^>]*?' + regexpDefines + '[\\s\\S]*?-->([\\s\\S]*?)<!--[^>]*?#ENDIFDEF[^>]*?-->','g'), '$1')
			callback(false, data.replace(new RegExp('<!--#IFDEF[\\s\\S]*?ENDIFDEF[\\s\\S]*?-->','g'), ''))
	else
		desc('Copy file for ' + path.basename(compiledFile))
		alterFunc = copyCallback
	alterFileTask(processedFile, compiledFile, alterFunc)
	currNamespace = getCurrentNamespace()
	return [currNamespace + compiledFile, currNamespace + processedFile]

jake.rmutils.createCopyTask = (inFile) ->
	return createCopyTask(path.join(currentDirs.src, inFile))

jake.rmutils.createCopyNamespace = (excludeFileTypes = ['coffee', 'ometa']) ->
	taskList = []
	namespace('copy', ->
		fileList = new jake.FileList()
		fileList.exclude(excludeDirs)
		fileList.include(path.join(currentDirs.src, '**'))
		fileList.exclude(new RegExp('(' + excludeFileTypes.join('|') + ')$'))
		for inFile in fileList.toArray()
			taskList = taskList.concat(createCopyTask(inFile))
		desc('Copy all files other than ' + excludeFileTypes.join(', ') + '  for ' + [currentCategory, currentModule].join(':') + '.')
		task('all', taskList)
	)
	return taskList

jake.rmutils.requirejsTask = (extraRequirejsConf) ->
	rootPath = path.resolve('src') + '/'
	requirejsConf = jake.mixin({
			paths: {
				'bcrypt': 'empty:'
				'passport-local': 'empty:'
				'pg': 'empty:'
			
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
				
				'sbvr-parser':				rootPath + 'common/sbvr-parser/out/processed/',
				'utils':					rootPath + 'common/utils/out/processed',
				
				'sbvr-frame':				rootPath + 'client/sbvr-frame/out/processed',
				'data-frame':				rootPath + 'client/data-frame/out/processed',
				'Prettify':					rootPath + 'client/prettify-ometa/out/processed/Prettify',
				'codemirror-ometa-bridge':	rootPath + 'client/codemirror-ometa-bridge/src',
				
				'sbvr-compiler':			rootPath + 'server/sbvr-compiler/out/processed',
				
				'server-glue':				rootPath + 'server/server-glue/out/processed',
				'express-emulator':			rootPath + 'server/express-emulator/out/processed',
				'data-server':				rootPath + 'server/data-server/out/processed',
				'editor-server':			rootPath + 'server/editor-server/out/processed',
				'database-layer':			rootPath + 'server/database-layer/out/processed',
				'passportBCrypt':			rootPath + 'server/passport-bcrypt/out/processed/passportBCrypt',
				
				'frame-glue':				rootPath + 'client/frame-glue/out/processed'
			}
			appDir: currentDirs.processed
			dir: currentDirs.final
			findNestedDependencies: true
		}
		extraRequirejsConf
	)
	buildFile = path.join(currentDirs.out, 'temp.build.js')
	desc('rjs optimise')
	task('requirejs',
		->
			console.log(requirejsConf)
			console.log(JSON.stringify(requirejsConf))
			console.log('Concatenating and minifying Javascript')
			fs.writeFileSync(buildFile, JSON.stringify(requirejsConf))
			requirejs.optimize(buildFile: buildFile, (buildResponse) ->
				console.log('require.js: ', buildResponse)
				fs.unlink(buildFile)
				complete()
			)
		async: true
	)
	return getCurrentNamespace() + 'requirejs'
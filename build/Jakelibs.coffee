fs = require('fs')
path = require('path')

process.env.outputDir ?= 'out/'
process.env.compiledDir ?= process.env.outputDir + 'compiled/'
process.env.processedDir ?= process.env.outputDir + 'processed/'
process.env.minifiedDir ?= process.env.outputDir + 'minified/'

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
		minified: removeTrailingSlash(path.join(rootDir, process.env.minifiedDir))

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

jake.rmutils.storedTasks = storedTasks = {}
jake.rmutils.getStoredTasks = (forCategory = null, forModule = null, forBuildType = null) ->
	fetchedTasks = []
	for category, modules of storedTasks when forCategory == null or forCategory == category
		for module, buildTypes of modules when forModule == null or forModule == module
			for buildType, tasks of buildTypes when forBuildType == null or forBuildType == buildType
				fetchedTasks = fetchedTasks.concat(tasks)
	return fetchedTasks

addTask = (buildType, task) ->
	storedTasks[currentCategory] ?= {}
	storedTasks[currentCategory][currentModule] ?= {}
	storedTasks[currentCategory][currentModule][buildType] ?= []

	task = getCurrentNamespace() + task
	storedTasks[currentCategory][currentModule][buildType].push(task)
	return task

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
									console.log('Finished writing: ', outFile)
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
		
		dirList = [currentDirs.compiled, currentDirs.processed, currentDirs.minified]
		for folderPath in folderList.toArray()
			# We want to keep the output dir paths relative to the src dir paths
			folderPath = path.relative(currentDirs.src, folderPath)
			dirList.push(path.join(currentDirs.compiled, folderPath), path.join(currentDirs.processed, folderPath), path.join(currentDirs.minified, folderPath))
		
		currNamespace = getCurrentNamespace()
		directory(currentDirs.output)
		taskList.push(addTask('dir', currentDirs.output))
		for dirTask in dirList
			directory(dirTask, [currNamespace + path.dirname(dirTask)])
			taskList.push(addTask('dir', dirTask))
		
		desc('Create all output directories.')
		task('all', taskList)
	)
	return taskList

createInstallTasks = () ->
	taskList = []
	if fs.existsSync(path.join(currentDirs.src, 'package.json'))
		namespace('install', ->
			actualInstallTask = (buildType, dir) ->
				desc('Install npm dependencies')
				task(buildType,
					->
						exec('npm install', {cwd: dir}, (err, stdout, stderr) ->
							console.log(stdout)
							console.error(stderr)
							if err
								fail()
							else
								complete()
						)
					async: true
				)
				taskList.push(addTask(buildType, buildType))
			actualInstallTask('compile', currentDirs.compiled)
			actualInstallTask('process', currentDirs.processed)
			actualInstallTask('minified', currentDirs.processed)
		)
	return taskList

jake.rmutils.boilerplate = (compileCopyTasks) ->
	directoryTasks = createDirectoryTasks()
	installTasks = createInstallTasks()

	desc('Compile all of this module')
	task('all', directoryTasks.concat(compileCopyTasks, installTasks))

	outputDir = currentDirs.output
	desc('Clean up created files')
	task('clean', ->
		jake.rmRf(outputDir)
	)
	addTask('clean', 'clean')

createCompileNamespace = (action, fileType, createCompileTaskFunc) ->
	taskList = []
	namespace(fileType, ->
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
	minifiedFile = path.join(currentDirs.minified, extFile)
	return {compiledFile, processedFile, minifiedFile}

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

uglifyMin = (data, callback) ->
	ast = uglify.parser.parse(data)
	ast = uglify.uglify.ast_mangle(ast)
	ast = uglify.uglify.ast_squeeze(ast)
	code = uglify.uglify.gen_code(ast)
	callback(false, code)

jake.rmutils.ometaCompileNamespace = () ->
	return createCompileNamespace('Compile', 'ometa', (srcFile) ->
		{compiledFile, processedFile, minifiedFile} = getCompiledFilePaths(srcFile, '.js')
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
		desc('Minify ' + srcFile)
		alterFileTask(minifiedFile, processedFile, uglifyMin)
		return [addTask('compile', compiledFile), addTask('process', processedFile), addTask('process', minifiedFile)]
	)

jake.rmutils.coffeeCompileNamespace = () ->
	return createCompileNamespace('Compile', 'coffee', (srcFile) ->
		{compiledFile, processedFile, minifiedFile} = getCompiledFilePaths(srcFile, '.js')
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
		desc('Minify ' + srcFile)
		alterFileTask(minifiedFile, processedFile, uglifyMin)
		return [addTask('compile', compiledFile), addTask('process', processedFile), addTask('process', minifiedFile)]
	)

createCopyTask = (srcFile) ->
	{compiledFile, processedFile, minifiedFile} = getCompiledFilePaths(srcFile)
	copyCallback = (data, callback) ->
		console.log('Copying file for: '+ this.name)
		callback(false, data)
	
	desc('Copy ' + srcFile)
	alterFileTask(compiledFile, srcFile, copyCallback)
	switch path.extname(srcFile)
		when '.html'
			desc('Process ifdefs for ' + srcFile)
			alterFileTask(processedFile, compiledFile, (data, callback) -> 
				regexpDefines = (define for define, value of defines when value[1]).join('|')
				console.log('Processing HTML IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('<!--[^>]*?#IFDEF[^>]*?(?=' + regexpDefines + ')[\\s\\S]*?-->([\\s\\S]*?)<!--[^>]*?#ENDIFDEF[^>]*?-->','g'), '$1')
				callback(false, data.replace(new RegExp('<!--#IFDEF[\\s\\S]*?ENDIFDEF[\\s\\S]*?-->','g'), ''))
			)
			alterFileTask(minifiedFile, processedFile, copyCallback)
		when '.js'
			desc('Process ' + srcFile)
			alterFileTask(processedFile, compiledFile, uglifyDefines)
			desc('Minify ' + srcFile)
			alterFileTask(minifiedFile, processedFile, uglifyMin)
		else
			desc('Copy file for ' + srcFile)
			alterFileTask(processedFile, compiledFile, copyCallback)
			desc('Copy file for ' + srcFile)
			alterFileTask(minifiedFile, processedFile, copyCallback)
	return [addTask('compile', compiledFile), addTask('process', processedFile), addTask('minify', minifiedFile)]

jake.rmutils.createCopyTask = (srcFile) ->
	return createCopyTask(path.join(currentDirs.src, srcFile))

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
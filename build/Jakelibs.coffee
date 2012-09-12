fs = require('fs')
path = require('path')

process.env.outputDir ?= 'out/'
process.env.intermediateDir ?= process.env.outputDir + 'intermediate/'
process.env.finalDir ?= process.env.outputDir + 'publish/'
process.env.modules ?= ''
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
		intermediate: removeTrailingSlash(path.join(rootDir, process.env.intermediateDir))
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

jake.rmutils.boilerplate = (extraTasks) ->
	intermediateDir = currentDirs.intermediate
	taskList = []
	namespace('dir', ->
		folderList = new jake.FileList()
		folderList.clearExclude() # Clear the default exclude of folders
		folderList.include(path.join(currentDirs.src, '**'))
		folderList.exclude(excludeDirs)
		folderList.exclude(excludeNonDirs)
		
		dirList = [intermediateDir, currentDirs.final]
		for folderPath in folderList.toArray()
			# We want to keep the output dir paths relative to the src dir paths
			folderPath = path.relative(currentDirs.src, folderPath)
			dirList.push(path.join(intermediateDir, folderPath), path.join(currentDirs.final, folderPath))
		
		currNamespace = getCurrentNamespace()
		directory(currentDirs.output)
		taskList.push(currNamespace + currentDirs.output)
		for dirTask in dirList
			directory(dirTask, [currNamespace + path.dirname(dirTask)])
			taskList.push(currNamespace + dirTask)
		
		desc('Create all output directories.')
		task('all', taskList)
	)
	if fs.existsSync(path.join(currentDirs.src, 'package.json'))
		extraTasks.push(getCurrentNamespace() + 'install')
		desc('Install npm dependencies')
		task('install',
			->
				exec('npm install', {cwd: intermediateDir}, (err, stdout, stderr) ->
					console.log(stdout)
					console.error(stderr)
					if err
						fail()
					else
						complete()
				)
			async: true
		)

	desc('Compile all of this module')
	task('all', taskList.concat(extraTasks))

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
		for inFile in fileList.toArray()
			outFile = path.join(currentDirs.intermediate, path.relative(currentDirs.src, inFile))
			outFile = path.join(path.dirname(outFile), path.basename(outFile, '.' + fileType) + '.js')
			
			taskList.push(currNamespace + outFile)
			desc(action + ' ' + inFile)
			createCompileTaskFunc(inFile, outFile)
		desc(action + ' all ' + fileType + ' files for ' + [currentCategory, currentModule].join(':') + '.')
		task('all', taskList)
	)
	return taskList

jake.rmutils.ometaCompileNamespace = () ->
	return createCompileNamespace('Compile', 'ometa', (inFile, outFile) ->
		file(outFile,
			->
				ometa.compileOmetaFile(inFile, outFile, true, (err) ->
					if err
						fail()
					else
						complete()
				)
			async: true
		)
	)

jake.rmutils.coffeeCompileNamespace = () ->
	return createCompileNamespace('Compile', 'coffee', (inFile, outFile) ->
		alterFileTask(outFile, inFile,
			(data, callback) ->
				console.log('Compiling CoffeeScript for: '+ this.name)
				try
					callback(false, coffee.compile(data))
				catch e
					callback(e)
		)
	)

createCopyTask = (inFile) ->
	outFile = path.join(currentDirs.intermediate, path.relative(currentDirs.src, inFile))
	desc('Copy ' + inFile)
	alterFileTask(outFile, inFile,
		(data, callback) ->
			console.log('Copying file for: '+ this.name)
			callback(false, data)
	)
	return getCurrentNamespace() + outFile

jake.rmutils.createCopyTask = (inFile) ->
	return createCopyTask(path.join(currentDirs.src, inFile))

jake.rmutils.createCopyNamespace = (excludeFileTypes) ->
	taskList = []
	namespace('copy', ->
		fileList = new jake.FileList()
		fileList.exclude(excludeDirs)
		fileList.include(path.join(currentDirs.src, '**'))
		fileList.exclude(new RegExp('(' + excludeFileTypes.join('|') + ')$'))
		for inFile in fileList.toArray()
			taskList.push(createCopyTask(inFile))
		desc('Copy all files other than ' + excludeFileTypes.join(', ') + '  for ' + [currentCategory, currentModule].join(':') + '.')
		task('all', taskList)
	)
	return taskList
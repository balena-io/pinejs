fs = require('fs')
path = require('path')
ometa = require('../src/common/ometa-compiler/src/ometac.coffee')
coffee = require('coffee-script')

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


currentCategory = ''
currentModule = ''
currentDirs =
	root: ''
	src: ''
	output: ''
	intermediate: ''
	final: ''

removeTrailingSlash = (s) -> s.replace(/[/\\]*$/, '')

jake.rmutils.importJakefile = (category, module) ->
	jakefile = path.resolve(path.join('src', category, module, 'build', 'Jakefile.coffee'))
	if fs.existsSync(jakefile)
		currentCategory = category
		currentModule = module
		rootDir = removeTrailingSlash(path.join('src', currentCategory, currentModule))
		currentDirs =
			root: rootDir
			src: removeTrailingSlash(path.join(rootDir, 'src'))
			output: removeTrailingSlash(path.join(rootDir, process.env.outputDir))
			intermediate: removeTrailingSlash(path.join(rootDir, process.env.intermediateDir))
			final: removeTrailingSlash(path.join(rootDir, process.env.finalDir))
		require(jakefile)
		return true
	return false

jake.rmutils.excludeDirs = excludeDirs = [process.env.outputDir, '.git', 'node_modules', 'build']
jake.rmutils.dirNamespace = () ->
	taskList = []
	namespace('dir', ->
		folderList = new jake.FileList()
		folderList.clearExclude() # Clear the default exclude of folders
		folderList.include(path.join(currentDirs.src, '**'))
		folderList.exclude(excludeDirs)
		folderList.exclude(excludeNonDirs)
		
		dirList = [currentDirs.intermediate, currentDirs.final]
		for folderPath in folderList.toArray()
			# We want to keep the output dir paths relative to the src dir paths
			folderPath = path.relative(currentDirs.src, folderPath)
			dirList.push(path.join(currentDirs.intermediate, folderPath), path.join(currentDirs.final, folderPath))
		
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

jake.rmutils.cleanTask = () ->
	jake.rmutils.cleanTask.taskList.push(getCurrentNamespace() + 'clean')
	outputDir = currentDirs.output
	desc('Clean up created files')
	task('clean', ->
		jake.rmRf(outputDir)
	)
jake.rmutils.cleanTask.taskList = []

createCompileNamespace = (fileType, createCompileTaskFunc) ->
	taskList = []
	namespace(fileType, ->
		currNamespace = getCurrentNamespace()
		fileList = new jake.FileList()
		fileList.include(path.join(currentDirs.src, '**', '*.' + fileType))
		for inFile in fileList.toArray()
			outFile = path.join(currentDirs.intermediate, path.relative(currentDirs.src, inFile))
			outFile = path.join(path.dirname(outFile), path.basename(outFile, '.' + fileType) + '.js')
			
			taskList.push(currNamespace + outFile)
			desc('Compile ' + inFile)
			createCompileTaskFunc(inFile, outFile)
		desc('Compile all ' + fileType + ' files for ' + [currentCategory, currentModule].join(':') + '.')
		task('all', taskList)
	)
	return taskList

jake.rmutils.ometaCompileNamespace = () ->
	return createCompileNamespace('ometa', (inFile, outFile) ->
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
	return createCompileNamespace('coffee', (inFile, outFile) ->
		alterFileTask(outFile, inFile,
			(data, callback) ->
				console.log('Compiling CoffeeScript for: '+ this.name)
				try
					callback(false, coffee.compile(data))
				catch e
					callback(e)
		)
	)
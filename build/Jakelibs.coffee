fs = require('fs')
path = require('path')
ometa = require('../src/common/ometa-compiler/src/ometac.coffee')

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

jake.rmutils.ometaCompileNamespace = () ->
	taskList = []
	namespace('OMeta', ->
		currNamespace = getCurrentNamespace()
		fileList = new jake.FileList()
		fileList.include(path.join(currentDirs.src, '**', '*.ometa'))
		for ometaFile in fileList.toArray()
			jsFile = path.join(currentDirs.intermediate, path.relative(currentDirs.src, ometaFile))
			jsFile = path.join(path.dirname(jsFile), path.basename(jsFile, '.ometa') + '.js')
			
			taskList.push(currNamespace + jsFile)
			desc('Compile ' + ometaFile)
			file(jsFile,
				do (ometaFile, jsFile) -> ->
					ometa.compileOmetaFile(ometaFile, jsFile, true, complete)
				async: true
			)
		desc('Compile all OMeta files for ' + [currentCategory, currentModule].join(':') + '.')
		task('all', taskList)
	)
	return taskList
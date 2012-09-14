fs = require('fs')
path = require('path')

require('./Jakelibs.coffee')
getCurrentNamespace = jake.rmutils.getCurrentNamespace
excludeNonDirs = jake.rmutils.excludeNonDirs
excludeDirs = jake.rmutils.excludeDirs

categorisedModules = {}
do ->
	modulesList = new jake.FileList()
	modulesList.include('src/*/*')
	modulesList.exclude(excludeNonDirs)
	for module in modulesList.toArray()
		category = path.basename(path.dirname(module))
		categorisedModules[category] ?= []
		categorisedModules[category].push(path.basename(module))

storedTaskDependencies = {}

namespace('dir', ->
	folderList = new jake.FileList()
	folderList.clearExclude() # Clear the default exclude of folders
	folderList.include('src/*/*')
	folderList.exclude(excludeDirs)
	folderList.exclude(excludeNonDirs)
	
	dirList = [process.env.compiledDir, process.env.processedDir, process.env.finalDir]
	for folderPath in folderList.toArray()
		dirList.push(path.join(process.env.compiledDir, folderPath), path.join(process.env.processedDir, folderPath), path.join(process.env.finalDir, folderPath))
	
	currNamespace = getCurrentNamespace()
	directory(process.env.outputDir)
	taskList = [currNamespace + process.env.outputDir]
	for dirTask in dirList
		directory(dirTask, [currNamespace + path.dirname(dirTask)])
		taskList.push(currNamespace + dirTask)
	
	storedTaskDependencies[getCurrentNamespace() + 'all'] = taskList
	desc('Create all output directories.')
	task('all', taskList)
)

namespace('module', ->
	taskList = []
	for category of categorisedModules
		namespace(category, do (category) -> ->
			categoryTaskList = []
			for module in categorisedModules[category]
				namespace(module, do (module) -> ->
					if jake.rmutils.importJakefile(category, module)
						categoryTaskList.push(getCurrentNamespace() + 'all')
				)
			storedTaskDependencies[getCurrentNamespace() + 'all'] = categoryTaskList
			taskList = taskList.concat(categoryTaskList)
			desc('Build all ' + category + ' modules.')
			task('all', categoryTaskList)
		)
	
	storedTaskDependencies[getCurrentNamespace() + 'all'] = taskList
	desc('Build all modules.')
	task('all', taskList)
)

desc('Compile everything')
task('compile', jake.rmutils.getStoredTasks(null, null, 'dir').concat(jake.rmutils.getStoredTasks(null, null, 'compile')))

desc('Process everything')
task('process', jake.rmutils.getStoredTasks(null, null, 'dir').concat(jake.rmutils.getStoredTasks(null, null, 'process')))

desc('Clean everything')
task('clean', jake.rmutils.getStoredTasks(null, null, 'clean'), ->
	jake.rmRf(process.env.outputDir)
)

desc('Build everything.')
task('all', storedTaskDependencies['module:all'])
task('default', 'all')

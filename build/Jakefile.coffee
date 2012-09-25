fs = require('fs')
path = require('path')

require('./Jakelibs.coffee')
getStoredTasks = jake.rmutils.getStoredTasks
getCurrentNamespace = jake.rmutils.getCurrentNamespace
excludeNonDirs = jake.rmutils.excludeNonDirs
excludeDirs = jake.rmutils.excludeDirs
excludedDirs = jake.rmutils.excludedDirs

builtModules = []
categorisedModules = {}
# TODO: Move files into folders and remove the support for files in a category rather than module.
categorisedFiles = {}
do ->
	modulesList = new jake.FileList()
	modulesList.include('src/*/*')
	modulesList.exclude(excludeNonDirs)
	for module in modulesList.toArray()
		category = path.basename(path.dirname(module))
		categorisedModules[category] ?= []
		categorisedModules[category].push(path.basename(module))
	
	filesList = new jake.FileList()
	filesList.include('src/*/*.*')
	for file in filesList.toArray()
		category = path.basename(path.dirname(file))
		categorisedFiles[category] ?= []
		categorisedFiles[category].push(path.basename(file))

namespace('module', ->
	taskList = []
	for category of categorisedModules
		namespace(category, do (category) -> ->
			categoryTaskList = []
			for module in categorisedModules[category]
				namespace(module, do (module) -> ->
					if jake.rmutils.importJakefile(category, module)
						builtModules.push(module)
						categoryTaskList.push(getCurrentNamespace() + 'all')
				)
			taskList = taskList.concat(categoryTaskList)
			desc('Build all ' + category + ' modules.')
			task('all', categoryTaskList)
		)
	
	desc('Build all modules.')
	task('all', taskList)
)

namespace('dir', ->
	folderList = new jake.FileList()
	folderList.include('src/*')
	folderList.include('src/*/*')
	folderList.include('src/*/*/src/**')
	folderList.exclude(excludedDirs)
	folderList.exclude(excludeNonDirs)
	fullFolderList = []
	for folderPath in folderList.toArray()
		fullFolderList.push(folderPath.replace(/src/g, ''))

	folderList = new jake.FileList()
	folderList.exclude(excludedDirs)
	folderList.exclude(excludeNonDirs)
	for category, modules of categorisedModules
		for module in modules when module not in builtModules
			folderList.include(path.join('src', category, module, '**'))
	for folderPath in folderList.toArray()
		fullFolderList.push(path.relative('src', folderPath))

	dirList = [process.env.compiledDir, process.env.processedDir, process.env.minifiedDir]
	for folderPath in fullFolderList
		dirList.push(path.join(process.env.compiledDir, folderPath), path.join(process.env.processedDir, folderPath), path.join(process.env.minifiedDir, folderPath))

	currNamespace = getCurrentNamespace()
	directory(process.env.outputDir)
	taskList = [currNamespace + process.env.outputDir]
	for dirTask in dirList
		directory(dirTask, [currNamespace + path.dirname(dirTask)])
		taskList.push(currNamespace + dirTask)
	
	desc('Create all output directories.')
	task('all', taskList)
)

namespace('consolidate', ->
	taskList = []
	categoryTaskList = {}
	for category, modules of categorisedModules
		namespace(category, do (category) -> ->
			categoryTaskList[category] = []
			for module in categorisedModules[category]
				namespace(module, do (module) -> ->
					moduleTaskList = []
					currNamespace = getCurrentNamespace()
					if module in builtModules
						minifyTasks = getStoredTasks(category, module, 'minify')
						for minifyTask in minifyTasks
							# console.log(minifyTask)
							minifyTaskFile = minifyTask.replace(/.*:/, '')
							consolidatedFilePath = path.relative(path.join('src', category, module, process.env.minifiedDir), minifyTaskFile)
							consolidatedFilePath = path.join(process.env.compiledDir, category, module, consolidatedFilePath)
							# console.log(consolidatedFilePath, minifyTask, minifyTaskFile)
							switch path.extname(minifyTaskFile)
								when '.html'
									jake.rmutils.alterFileTask(consolidatedFilePath, minifyTaskFile, [minifyTask], (data, callback) -> 
										console.log('Processing HTML DEV/BUILD tags for: '+ this.name)
										callback(false, data.replace(new RegExp('<!--[^>]*?#DEV[\\s\\S]*?#BUILT([\\s\\S]*?)-->','g'), '$1'))
									)
								when '.js'
									jake.rmutils.alterFileTask(consolidatedFilePath, minifyTaskFile, [minifyTask], (data, callback) -> 
										console.log('Processing JS DEV/BUILD tags for: '+ this.name)
										jake.rmutils.uglifyMin(data, callback,
											DEV: jake.rmutils.resolveDefine(false)
											BUILD: jake.rmutils.resolveDefine(true)
										)
									)
								else
									jake.rmutils.copyFileTask(consolidatedFilePath, minifyTaskFile, [minifyTask])
							moduleTaskList.push(currNamespace + consolidatedFilePath)
					else
						moduleDir = path.join('src', category, module)
						filesList = new jake.FileList()
						filesList.exclude(excludeDirs)
						filesList.exclude(excludedDirs)
						filesList.include(path.join(moduleDir, '**'))
						for file in filesList.toArray()
							consolidatedFilePath = path.relative(moduleDir, file)
							consolidatedFilePath = path.join(process.env.compiledDir, category, module, consolidatedFilePath)
							jake.rmutils.copyFileTask(consolidatedFilePath, file)
							moduleTaskList.push(currNamespace + consolidatedFilePath)
					task('all', moduleTaskList)
					categoryTaskList[category].push(currNamespace + 'all')
				)
		)
	for category, modules of categorisedFiles
		namespace(category, do (category) -> ->
			categoryTaskList[category] ?= []
			for file in categorisedFiles[category]
				copyTaskFile = path.join('src', category, file)
				consolidatedFilePath = path.join(process.env.compiledDir, category, file)
				jake.rmutils.copyFileTask(consolidatedFilePath, copyTaskFile)
				categoryTaskList[category].push(getCurrentNamespace() + consolidatedFilePath)
		)
	for category of categoryTaskList
		namespace(category, do (category) -> ->
			task('all', categoryTaskList[category])
			taskList.push(getCurrentNamespace() + 'all')
		)
	desc('Consolidate all modules')
	task('all', ['dir:all'].concat(taskList))
)

desc('Compile everything')
task('compile', getStoredTasks(null, null, 'dir').concat(getStoredTasks(null, null, 'compile'), getStoredTasks(null, null, 'compile-install')))

desc('Process everything')
task('process', getStoredTasks(null, null, 'dir').concat(getStoredTasks(null, null, 'process'), getStoredTasks(null, null, 'process-install')))

desc('Minify everything')
task('minify', getStoredTasks(null, null, 'dir').concat(getStoredTasks(null, null, 'minify'), getStoredTasks(null, null, 'minify-install')))

desc('Clean everything')
task('clean', getStoredTasks(null, null, 'clean'), ->
	jake.rmRf(process.env.outputDir)
)

desc('Build everything.')
task('all', ['module:all'])
task('default', 'all')

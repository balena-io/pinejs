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
			task('all', categoryTaskList, ->)
		)
	
	desc('Build all modules.')
	task('all', taskList, ->)
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
	task('all', taskList, ->)
)

namespace('consolidate', ->
	consolidateTypes = [{
			dir: process.env.compiledDir
			type: 'compile'
			uglifyTask: jake.rmutils.uglifyDefines
		}, {
			dir: process.env.processedDir
			type: 'process'
			uglifyTask: jake.rmutils.uglifyDefines
		}, {
			dir: process.env.minifiedDir
			type: 'minify'
			uglifyTask: jake.rmutils.uglifyMin
		}
	]
	consolidateTypeTaskList = []
	consolidateTypeInstallTaskList = []
	for consolidateType in consolidateTypes
		namespace(consolidateType.type, do(consolidateType) -> ->
			taskList = []
			categoryTaskList = {}
			for category, modules of categorisedModules
				namespace(category, do (category) -> ->
					categoryTaskList[category] = []
					for module in categorisedModules[category]
						namespace(module, do (module) -> ->
							moduleTaskList = []
							currNamespace = getCurrentNamespace()
							consolidatedFolderPath = path.join(consolidateType.dir, category, module)
							if module in builtModules
								storedTasks = getStoredTasks(category, module, consolidateType.type)
								for storedTask in storedTasks
									# console.log(storedTask)
									taskFile = storedTask.replace(/.*:/, '')
									consolidatedFilePath = path.join(consolidatedFolderPath, path.relative(path.join('src', category, module, consolidateType.dir), taskFile))
									# console.log(consolidatedFilePath, storedTask, taskFile)
									switch path.extname(taskFile)
										when '.html'
											jake.rmutils.alterFileTask(consolidatedFilePath, taskFile, [storedTask], (data, callback) -> 
												console.log('Processing HTML DEV/BUILD tags for: '+ this.name)
												callback(false, data.replace(new RegExp('<!--[^>]*?#DEV[\\s\\S]*?#BUILT([\\s\\S]*?)-->','g'), '$1'))
											)
										when '.js'
											jake.rmutils.alterFileTask(consolidatedFilePath, taskFile, [storedTask], (data, callback) -> 
												console.log('Processing JS DEV/BUILD tags for: '+ this.name)
												consolidateType.uglifyTask(data, callback,
													DEV: jake.rmutils.resolveDefine(false)
													BUILD: jake.rmutils.resolveDefine(true)
												)
											)
										else
											jake.rmutils.copyFileTask(consolidatedFilePath, taskFile, [storedTask])
									moduleTaskList.push(currNamespace + consolidatedFilePath)
							else
								moduleDir = path.join('src', category, module)
								filesList = new jake.FileList()
								filesList.exclude(excludeDirs)
								filesList.exclude(excludedDirs)
								filesList.include(path.join(moduleDir, '**'))
								for file in filesList.toArray()
									consolidatedFilePath = path.join(consolidatedFolderPath, path.relative(moduleDir, file))
									jake.rmutils.copyFileTask(consolidatedFilePath, file)
									moduleTaskList.push(currNamespace + consolidatedFilePath)
							task('all', moduleTaskList, ->)
							categoryTaskList[category].push(currNamespace + 'all')
						)
				)
			for category, modules of categorisedFiles
				namespace(category, do (category) -> ->
					categoryTaskList[category] ?= []
					consolidatedFolderPath = path.join(consolidateType.dir, category)
					for file in categorisedFiles[category]
						copyTaskFile = path.join('src', category, file)
						consolidatedFilePath = path.join(consolidatedFolderPath, file)
						jake.rmutils.copyFileTask(consolidatedFilePath, copyTaskFile)
						categoryTaskList[category].push(getCurrentNamespace() + consolidatedFilePath)
				)
			for category of categoryTaskList
				namespace(category, do (category) -> ->
					task('all', categoryTaskList[category], ->)
					taskList.push(getCurrentNamespace() + 'all')
				)
			currNamespace = getCurrentNamespace()
			
			desc('Consolidate all ' + consolidateType.type + ' modules')
			task('all', ['dir:all'].concat(taskList), ->
				fs = require('fs')
				filesList = new jake.FileList()
				filesList.exclude(excludeDirs)
				filesList.exclude(excludedDirs)
				filesList.exclude(/(^|[\/\\])src[\/\\]external([\/\\]|$)/)
				filesList.include('src/**/package.json')
				combinedPackage = {
					name: 'rulemotion-canvas'
					version: '0.0.1'
					dependencies: {}
				}
				for filePath in filesList.toArray()
					try
						packageObj = JSON.parse(fs.readFileSync(filePath, 'utf8'))
					catch e
						console.error(filePath, e)
						throw e
					for key, value of packageObj
						switch key
							when 'name', 'version'
								null
							when 'dependencies'
								for dependency, version of value
									if dependency of combinedPackage.dependencies
										combinedVersion = combinedPackage.dependencies[dependency]
										if version != combinedVersion
											throw console.error('Trying to combine mismatched dependency versions: ', filePath, dependency, ' - ', version, ' : ', combinedVersion)
									else
										combinedPackage.dependencies[dependency] = version
							else
								console.warn('Hit an unhandled package.json element:', filePath, key)
								if key of combinedPackage
									throw console.error('Key is already in combined package: ', key)
								else
									combinedPackage[key] = value
				fs.writeFileSync(path.join(consolidateType.dir, 'package.json'), JSON.stringify(combinedPackage), 'utf8')
			)
			consolidateTypeTaskList.push(currNamespace + 'all')
			
			consolidateTypeInstallTaskList.push(currNamespace + 'install')
			task('install', [currNamespace + 'all'],
				->
					require('child_process').exec('npm install', {cwd: consolidateType.dir}, (err, stdout, stderr) ->
						console.log(stdout)
						console.error(stderr)
						if err
							fail()
						else
							complete()
					)
				async: true
			)
		)
	desc('Consolidate all modules')
	task('all', ['dir:all'].concat(consolidateTypeTaskList), ->)
	desc('Install all consolidated modules')
	task('install', ['dir:all'].concat(consolidateTypeInstallTaskList), ->)
)

desc('Compile everything')
task('compile', getStoredTasks(null, null, 'dir').concat(getStoredTasks(null, null, 'compile'), getStoredTasks(null, null, 'compile-install')), ->)

desc('Process everything')
task('process', getStoredTasks(null, null, 'dir').concat(getStoredTasks(null, null, 'process'), getStoredTasks(null, null, 'process-install')), ->)

desc('Minify everything')
task('minify', getStoredTasks(null, null, 'dir').concat(getStoredTasks(null, null, 'minify'), getStoredTasks(null, null, 'minify-install')), ->)

desc('Clean everything')
task('clean', getStoredTasks(null, null, 'clean'), ->
	jake.rmRf(process.env.outputDir)
)

desc('Build MySQL DDUI server/client.')
task('mysql-drawdata', ['clean'], 
	->
		jake.rmutils.setDefines(
			DDUI_ENABLED: true
			BROWSER_SERVER_ENABLED: false
			SBVR_SERVER_ENABLED: true
			EDITOR_SERVER_ENABLED: false
			ENV_NODEJS: true
			USE_MYSQL: true
			USE_POSTGRES: false
		)
		allModules = jake.Task['consolidate:all']
		allModules.once('complete', complete)
		allModules.invoke()
	async: true
)

desc('Build everything.')
task('all', ['consolidate:all'], ->)

desc('Install everything.')
task('install', ['consolidate:install'], ->)
task('default', 'install', ->)

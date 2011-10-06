process.chdir('..')
process.env.outputDir ?= 'out/'
process.env.intermediateDir ?= process.env.outputDir + 'intermediate/'
process.env.finalDir ?= process.env.outputDir + 'publish/'
process.env.modules ?= ''

requirejsConf =
	appDir: process.env.intermediateDir,
	baseUrl: "js",
	dir: process.env.finalDir,
	#optimize: "none",
	modules: [
		name: "main"
    ]

excludeDirs = [process.env.outputDir, '.git', 'node_modules', 'build']
copyToIntermediate = ['index.html', 'favicon.ico', 'css/**/*.css', 'CodeMirror2/lib/codemirror.css', 'CodeMirror2/theme/default.css', 'package.json']
copyToFinal = ['index.html', 'favicon.ico', 'js/libs/*', 'css/**/*.css', 'CodeMirror2/lib/codemirror.css', 'CodeMirror2/theme/default.css', 'package.json']

storedTaskDependencies = {}

fs = require('fs')
path = require('path')

# alterFileTask(taskName, [taskDependencies], inFile, outFile, alterFunc)
# alterFunc takes data, returns altered data
alterFileTask = (outFile, inFile, alterFunc, taskDependencies = []) ->
	taskDependencies.push(inFile)
	taskDependencies.push('dir:'+path.dirname(outFile) + '/') if outFile.indexOf(process.env.outputDir) is 0
	file(outFile, taskDependencies,
		-> 
			task = this
			data = fs.readFileSync(inFile, 'utf8')
			fail('Error reading file "' + inFile + '": ' + err) if err?
			data = alterFunc.call(task, data)
			console.log('Writing to: ', outFile)
			fs.writeFileSync(outFile, data)
	)
# Async version, requires fixing tasks not being run after async prereqs in order to work.
#	file(outFile, taskDependencies,
#		-> 
#			task = this
#			fs.readFile(inFile, 'utf8', (err, data) ->
#				fail('Error reading file "' + inFile + '": ' + err) if err?
#				data = alterFunc.call(task, data)
#				fs.writeFile(outFile, data, null, ->
#					complete()
#				)
#			)
#		true
#	)

runCommand = (command, callback) ->
	console.log(command)
	require('child_process').exec(command, (error, stdout, stderr) ->
		if error isnt null
			console.log error.message
		else
			console.log 'Command Finished', stdout
		callback()
	)

getCurrentNamespace = () ->
	fullNamespace = ''
	currNamespace = jake.currentNamespace
	while currNamespace.parentNamespace?
		fullNamespace = currNamespace.name + ':' + fullNamespace
		currNamespace = currNamespace.parentNamespace
	return fullNamespace

namespace('dir', ->
	folderList = new jake.FileList()
	folderList.clearExclude() #Clear the default exclude of folders
	folderList.include('**')
	folderList.exclude(excludeDirs)
	folderList.exclude( (name) -> #Exclude non-directories
		try
			stats = fs.statSync(name)
			return !stats.isDirectory()
		catch e
			console.log(e)
			return true
	)
	dirList = [process.env.intermediateDir, process.env.finalDir]
	for folderPath in folderList.toArray()
		dirList.push(path.join(process.env.intermediateDir, folderPath), path.join(process.env.finalDir, folderPath))
	
	currNamespace = getCurrentNamespace()
	directory(process.env.outputDir)
	taskList = [currNamespace+process.env.outputDir]
	for dirTask in dirList
		directory(dirTask, [currNamespace + path.dirname(dirTask) + '/'])
		taskList.push(currNamespace + dirTask)
	
	storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
	desc('Create all output directories.')
	task('all', taskList)
)

namespace('copy', ->

	namespace('intermediate', ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include(copyToIntermediate)
		for inFile in fileList.toArray()
			outFile = path.join(process.env.intermediateDir, inFile)
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Copying to intermediate: ' + this.name)
				return data
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Copy files to intermediate')
		task('all', taskList)
	)

	namespace('final', ->
		taskList = ['copy:intermediate:all']
		fileList = new jake.FileList()
		fileList.include(copyToFinal)
		for copyFile in fileList.toArray()
			inFile = path.join(process.env.intermediateDir, copyFile)
			outFile = path.join(process.env.finalDir, copyFile)
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Copying to final: ' + this.name)
				return data
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Copy files to final')
		task('all', taskList)
	)
	desc('Copy all output files')
	task('all', ['copy:intermediate:all', 'copy:final:all'])
)

namespace('ifdefs', () ->
	namespace('js', () ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include('**.js')
		fileList.exclude(excludeDirs)
		for inFile in fileList.toArray()
			outFile = process.env.intermediateDir + inFile
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Processing Javascript IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF(?!\\*/)*?' + process.env.modules + '[\\s\\S]*?\\*/([\\s\\S]*?)/\\*(?!\\*/)*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '$1')
				return data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF[\\s\\S]*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '')
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Process IFDEFs for all Javascript files')
		task('all', taskList)
	)

	namespace('ometa', () ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include('js/**.ometa','js/**.ojs')
		for inFile in fileList.toArray()
			outFile = process.env.intermediateDir + inFile
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Processing OMeta IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF(?!\\*/)*?' + process.env.modules + '[\\s\\S]*?\\*/([\\s\\S]*?)/\\*(?!\\*/)*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '$1')
				return data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF[\\s\\S]*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '')
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Process IFDEFs for all OMeta files')
		task('all', taskList)
	)

	namespace('coffee', () ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include('**.coffee')
		fileList.exclude(excludeDirs)
		for inFile in fileList.toArray()
			outFile = process.env.intermediateDir + inFile
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Processing Coffee IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('#IFDEF.*?' + process.env.modules + '.*([\\s\\S]*?)#ENDIFDEF.*','g'), '$1')
				return data.replace(new RegExp('#IFDEF[\\s\\S]*?#ENDIFDEF.*','g'), '')
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Process IFDEFs for all Coffee files')
		task('all', taskList)
	)

	namespace('html', () ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include('**.html')
		fileList.exclude(excludeDirs)
		for inFile in fileList.toArray()
			outFile = process.env.intermediateDir + inFile
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Processing HTML IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('<!--[^>]*?#IFDEF[^>]*?' + process.env.modules + '[\\s\\S]*?-->([\\s\\S]*?)<!--[^>]*?#ENDIFDEF[^>]*?-->','g'), '$1')
				return data.replace(new RegExp('<!--#IFDEF[\\s\\S]*?ENDIFDEF[\\s\\S]*?-->','g'), '')
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Process IFDEFs for all HTML files')
		task('all', taskList)
	)
	
	taskList = storedTaskDependencies['ifdefs:js:all'].concat(storedTaskDependencies['ifdefs:ometa:all']).concat(storedTaskDependencies['ifdefs:coffee:all']).concat(storedTaskDependencies['ifdefs:html:all'])
	storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
	desc('Process all IFDEFs.')
	task('all', taskList)
)

namespace('ometa', ->
	addOmetaFiles = (prepend, taskDependencies = []) ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include(prepend+'**.ometa',prepend+'**.ojs')
		for inFile in fileList.toArray()
			outFile = inFile.replace(/\.(ojs|ometa)$/,'.js')
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile,
				(data) -> 
					console.log('Compiling OMeta for: '+ this.name)
					return require('./tools/ometac.js').compileOmeta(data, true, this.name)
				taskDependencies
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Build all ' + prepend + ' OMeta files')
		task('all', taskList)

	namespace('dev', ->
		addOmetaFiles('js/mylibs')
	)
	namespace('intermediate', ->
		addOmetaFiles(process.env.intermediateDir + 'js/mylibs', storedTaskDependencies['ifdefs:ometa:all'].concat(storedTaskDependencies['copy:intermediate:all']))
	)
	desc('Build all OMeta files')
	task('all', storedTaskDependencies['ometa:dev:all'].concat(storedTaskDependencies['ometa:intermediate:all']))
)

namespace('coffee', ->
	addCoffeeFiles = (prepend, taskDependencies = []) ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include(prepend+'**.coffee')
		fileList.exclude(excludeDirs)
		for inFile in fileList.toArray()
			outFile = inFile.replace(/\.coffee$/,'.js')
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile,
				(data) ->
					console.log('Compiling CoffeeScript for: '+ this.name)
					return require('coffee-script').compile(data)
				taskDependencies
			)
		storedTaskDependencies[getCurrentNamespace()+'all'] = taskList
		desc('Build all ' + prepend + ' OMeta files')
		task('all', taskList)

	namespace('dev', ->
		addCoffeeFiles('')
	)
	namespace('intermediate', ->
		addCoffeeFiles(process.env.intermediateDir + 'js', storedTaskDependencies['ifdefs:coffee:all'].concat(storedTaskDependencies['copy:intermediate:all']))
	)
	desc('Build all Coffee files')
	task('all', storedTaskDependencies['coffee:dev:all'].concat(storedTaskDependencies['coffee:intermediate:all']))
)

desc('Concatenate and minify Javascript')
fileList = new jake.FileList()
fileList.include('js/**.js')
task('js', storedTaskDependencies['ifdefs:all'].concat(storedTaskDependencies['ometa:intermediate:all']).concat(storedTaskDependencies['coffee:intermediate:all']).concat(fileList.toArray()),
	->
		console.log('Concatenating and minifying Javascript')
		fs.writeFileSync('temp.build.js', JSON.stringify(requirejsConf))
		require('requirejs').optimize(buildFile: 'temp.build.js', (buildResponse) ->
			console.log('require.js: ', buildResponse)
			fs.unlink('temp.build.js')
			complete()
		)
	true
)

namespace('editor', ->

	alterFileTask(process.env.finalDir + 'manifest.json', 'editor/manifest.json', (data) -> 
		console.log('Copying to final: ' + this.name)
		return data
	)

	alterFileTask(process.env.finalDir + 'Procfile', 'editor/Procfile'
		(data) -> 
			console.log('Copying to final: ' + this.name)
			return data
	)

	alterFileTask(process.env.finalDir + 'server.js', 'editor/server.js'
		(data) -> 
			console.log('Copying to final: ' + this.name)
			return data
		['coffee:dev:editor/server.js']
	)
	
	namespaceFinalDir = getCurrentNamespace() + process.env.finalDir
	
	desc('Package the editor')
	task('package', ['js', 'copy:final:all', namespaceFinalDir + 'manifest.json']
		->
			runCommand('google-chrome --pack-extension=' + path.resolve(process.env.finalDir) + ' --pack-extension-key=' + path.resolve('editor/editor.pem') + ' --no-message-box', ->
				console.log "Packaged editor."
				complete()
			)
		true
	)
	
	desc('Deploy the editor')
	task('deploy', ['js', 'copy:final:all', namespaceFinalDir + 'manifest.json', namespaceFinalDir + 'Procfile', namespaceFinalDir + 'server.js'], ->
		cwd = process.cwd()
		process.chdir(process.env.finalDir)
		runCommand 'git init', ->
			runCommand 'git add .', ->
				runCommand 'git commit -m "init"', ->
					runCommand 'git remote add heroku git@heroku.com:rulemotion-editor.git', ->
						runCommand 'git push heroku master -f', ->
							process.chdir(cwd)
							complete()
	)
)

desc('Do it all')
task('all', ['js','copy:final:all'])
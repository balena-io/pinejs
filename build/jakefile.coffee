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
	module: [
		name: "main"
    ]

excludeDirs = [process.env.outputDir,'.git','node_modules']
copyToIntermediate = ['index.html', 'favicon.ico', 'css/**/*.css', 'CodeMirror2/lib/codemirror.css', 'CodeMirror2/theme/default.css']
copyToFinal = ['index.html', 'favicon.ico', 'js/libs/*', 'CodeMirror2/lib/codemirror.css', 'CodeMirror2/theme/default.css']

fs = require('fs')
path = require('path')

# alterFileTask(taskName, [taskDependencies], inFile, outFile, alterFunc)
# alterFunc takes data, returns altered data
alterFileTask = (outFile, inFile, alterFunc, taskDependencies = []) ->
	taskDependencies.push(inFile)
	taskDependencies.push('dir:'+path.dirname(outFile) + '/') if outFile.indexOf(process.env.outputDir) is 0
	taskObj = {}
	taskObj[outFile] = taskDependencies
	file(taskObj
		-> 
			task = this
			data = fs.readFileSync(inFile, 'utf8')
			fail('Error reading file "' + inFile + '": ' + err) if err?
			data = alterFunc.call(task, data)
			fs.writeFile(outFile, data)
	)
# Async version, requires fixing tasks not being run after async prereqs in order to work.
#	file(taskObj
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
		taskObj = {}
		taskObj[dirTask] = [currNamespace + path.dirname(dirTask) + '/']
		directory(taskObj)
		taskList.push(currNamespace + dirTask)
	
	desc('Create all output directories.')
	task(all: taskList)
)

namespace('ifdefs', () ->
	desc('Process all IFDEFs.')
	task('all', ['ifdefs:js:all', 'ifdefs:ometa:all', 'ifdefs:html:all'])

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
		desc('Process IFDEFs for all Javascript files')
		task('all': taskList)
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
		desc('Process IFDEFs for all OMeta files')
		task('all': taskList)
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
		desc('Process IFDEFs for all HTML files')
		task('all': taskList)
	)
)

namespace('ometa', ->
	addOmetaFiles = (prepend) ->
		taskList = []
		fileList = new jake.FileList()
		fileList.include(prepend+'**.ometa',prepend+'**.ojs')
		for inFile in fileList.toArray()
			outFile = inFile.replace(/\.(ojs|ometa)$/,'.js')
			taskList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
					console.log('Compiling OMeta for: '+ this.name)
					return require('./tools/ometac.js').compileOmeta(data, true, this.name)
			)
		desc('Build all ' + prepend + ' OMeta files')
		task('all': taskList)

	namespace('dev', ->
		addOmetaFiles('js/mylibs')
	)
	namespace('intermediate', ->
		addOmetaFiles(process.env.intermediateDir + 'js/mylibs', ['ifdefs:ometa:all', 'copy:intermediate:all'])
	)
	desc('Build all OMeta files')
	task('all': ['ometa:dev:all', 'ometa:intermediate:all'])
)

desc('Concatenate and minify Javascript')
fileList = new jake.FileList()
fileList.include('js/**.js')
task('js': ['ifdefs:all','ometa:intermediate:all'].concat(fileList.toArray()),
	->
		console.log('Concatenating and minifying Javascript')
		fs.writeFileSync('temp.build.js', JSON.stringify(requirejsConf))
		require('requirejs').optimize(buildFile: 'temp.build.js', (buildResponse) ->
			console.log(buildResponse)
			fs.unlink('temp.build.js')
			complete()
		)
	true
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
		desc('Copy files to intermediate')
		task('all': taskList)
	)

	namespace('final', ->
		taskList = []
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
		desc('Copy files to final')
		task('all': taskList)
	)
	desc('Copy all output files')
	task('all': ['copy:intermediate:all', 'copy:final:all'])
)

desc('Do it all')
task('all': ['js','copy:final:all'])
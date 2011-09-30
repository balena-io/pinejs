process.chdir('..')
process.env.buildDir ?= 'bin'
process.env.modules ?= ''

excludeDirs = [process.env.buildDir,'.git','node_modules']

fs = require('fs')
path = require('path')

#alterFileTask(taskName, [taskDependencies], inFile, outFile, alterFunc)
# alterFunc takes data, returns altered data
alterFileTask = (outFile, inFile, alterFunc, taskDependencies = []) ->
	taskDependencies.push(inFile)
	taskDependencies.push('dir:'+path.dirname(outFile)) if outFile.indexOf(process.env.buildDir) is 0
	taskObj = {}
	taskObj[outFile] = taskDependencies
	file(taskObj
		-> 
			task = this
			fs.readFile(inFile, 'utf8', (err, data) ->
				fail('Error reading file "' + inFile + '": ' + err) if err?
				data = alterFunc.call(task, data)
				fs.writeFile(outFile, data, null, ->
					complete()
				)
			)
		true
	)

getCurrentNamespace = () ->
	fullNamespace = ''
	currNamespace = jake.currentNamespace
	while currNamespace.parentNamespace?
		fullNamespace = currNamespace.name + ':' + fullNamespace
		currNamespace = currNamespace.parentNamespace
	return fullNamespace

namespace('dir', ->
	directory(process.env.buildDir)
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
	for folderPath in folderList.toArray()
		newFolderPath = process.env.buildDir+'/'+folderPath
		folderList.push('dir:'+newFolderPath)
		taskObj = {}
		taskObj[newFolderPath] = ['dir:'+path.dirname(newFolderPath)]
		directory(taskObj)
	
	desc('Create all output directories.')
	task(all: folderList)
)

namespace('ifdefs', () ->
	desc('Process all IFDEFs.')
	task('all', ['ifdefs:js:all', 'ifdefs:ometa:all', 'ifdefs:html:all'])

	namespace('js', () ->
		outFileList = []
		fileList = new jake.FileList()
		fileList.include('**.js')
		fileList.exclude(excludeDirs)
		for inFile in fileList.toArray()
			outFile = process.env.buildDir + '/' + inFile
			outFileList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Processing Javascript IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF(?!\\*/)*?' + process.env.modules + '[\\s\\S]*?\\*/([\\s\\S]*?)/\\*(?!\\*/)*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '$1')
				return data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF[\\s\\S]*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '')
			)
		desc('Process IFDEFs for all Javascript files')
		task('all': outFileList)
	)

	namespace('ometa', () ->
		outFileList = []
		fileList = new jake.FileList()
		fileList.include('js/**.ometa','js/**.ojs')
		for inFile in fileList.toArray()
			outFile = process.env.buildDir + '/' + inFile
			outFileList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Processing OMeta IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('\\*(?!\\*/)*?#IFDEF(?!\\*/)*?' + process.env.modules + '[\\s\\S]*?\\*/([\\s\\S]*?)/\\*(?!\\*/)*?#ENDIFDEF[\\s\\S]*?\\*','g'), '$1')
				return data.replace(new RegExp('\\*(?!\\*/)*?#IFDEF[\\s\\S]*?#ENDIFDEF[\\s\\S]*?\\*','g'), '')
			)
		desc('Process IFDEFs for all OMeta files')
		task('all': outFileList)
	)

	namespace('html', () ->
		outFileList = []
		fileList = new jake.FileList()
		fileList.include('**.html')
		fileList.exclude(excludeDirs)
		for inFile in fileList.toArray()
			outFile = process.env.buildDir + '/' + inFile
			outFileList.push(getCurrentNamespace() + outFile)
			alterFileTask(outFile, inFile, (data) -> 
				console.log('Processing HTML IFDEFs for: '+ this.name)
				data = data.replace(new RegExp('<!--[^>]*?#IFDEF[^>]*?' + process.env.modules + '[\\s\\S]*?-->([\\s\\S]*?)<!--[^>]*?#ENDIFDEF[^>]*?-->','g'), '$1')
				return data.replace(new RegExp('<!--#IFDEF[\\s\\S]*?ENDIFDEF[\\s\\S]*?-->','g'), '')
			)
		desc('Process IFDEFs for all HTML files')
		task('all': outFileList)
	)
)

namespace('ometa', ->
	outFileList = []
	fileList = new jake.FileList()
	fileList.include('js/mylibs/**.ometa','js/mylibs/**.ojs')
	for inFile in fileList.toArray()
		outFile = inFile.replace(/\.(ojs|ometa)$/,'.js')
		outFileList.push(getCurrentNamespace() + outFile)
		alterFileTask(outFile, inFile, (data) -> 
			console.log('Compiling OMeta for: '+ this.name)
			return require('./tools/ometac.js').compileOmeta(data, true, this.name)
		)
	desc('Build all OMeta files')
	task('all': outFileList)
)
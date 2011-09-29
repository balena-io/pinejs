process.chdir('..')
process.env.buildDir ?= 'bin'
process.env.modules ?= ''

fs = require('fs')

# alterFunc takes data, returns altered data
alterFile = (inFile, outFile, alterFunc) ->
	data = fs.readFileSync(inFile, 'utf8')
	data = alterFunc(data)
	fs.writeFileSync(outFile, data)

namespace('dir', ->
	folderList = []
	addDirTasks = (dirName='') ->
		directory(process.env.buildDir)
		for folderName in fs.readdirSync(dirName or '.') when folderName not in [process.env.buildDir,'.git','node_modules']
			if dirName
				folderPath = dirName+'/'+folderName
			else
				folderPath = folderName
			fStats = fs.statSync(folderPath)
			if fStats.isDirectory()
				newFolderPath = process.env.buildDir+'/'+folderPath
				folderList.push('dir:'+newFolderPath)
				taskObj = {}
				if dirName
					taskObj[newFolderPath] = ['dir:'+process.env.buildDir+'/'+dirName]
				else
					taskObj[newFolderPath] = ['dir:'+process.env.buildDir]
				directory(taskObj)
				addDirTasks(folderPath)
	addDirTasks()
	task(all: folderList)
)	

namespace('ifdefs', () ->
	desc('Check for IFDEFs')
	task('all', ['ifdefs:js', 'ifdefs:ometa', 'ifdefs:html'])

	task('js': 'dir:all', () ->
		console.log('Checking for Javascript IFDEFs')
		fileList = new jake.FileList()
		fileList.include('js/**.js')
		for inFile in fileList.toArray()
			alterFile(inFile, process.env.buildDir + '/' + inFile, (data) -> 
				data = data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF(?!\\*/)*?' + process.env.modules + '[\\s\\S]*?\\*/([\\s\\S]*?)/\\*(?!\\*/)*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '$1')
				return data.replace(new RegExp('/\\*(?!\\*/)*?#IFDEF[\\s\\S]*?#ENDIFDEF[\\s\\S]*?\\*/','g'), '')
			)
	)
	task('ometa': 'dir:all', () ->
		console.log('Checking for OMeta IFDEFs')
		fileList = new jake.FileList()
		fileList.include('js/**.ometa','js/**.ojs')
		for inFile in fileList.toArray()
			alterFile(inFile, process.env.buildDir + '/' + inFile, (data) -> 
				data = data.replace(new RegExp('\\*(?!\\*/)*?#IFDEF(?!\\*/)*?' + process.env.modules + '[\\s\\S]*?\\*/([\\s\\S]*?)/\\*(?!\\*/)*?#ENDIFDEF[\\s\\S]*?\\*','g'), '$1')
				return data.replace(new RegExp('\\*(?!\\*/)*?#IFDEF[\\s\\S]*?#ENDIFDEF[\\s\\S]*?\\*','g'), '')
			)
	)

	task('html': 'dir:all', () ->
		console.log('Checking for HTML IFDEFs')
		fileList = new jake.FileList()
		fileList.include('**.html')
		fileList.exclude('bin/**.html')
		for inFile in fileList.toArray()
			alterFile(inFile, process.env.buildDir + '/' + inFile, (data) -> 
				data = data.replace(new RegExp('<!--[^>]*?#IFDEF[^>]*?' + process.env.modules + '[\\s\\S]*?-->([\\s\\S]*?)<!--[^>]*?#ENDIFDEF[^>]*?-->','g'), '$1')
				return data.replace(new RegExp('<!--#IFDEF[\\s\\S]*?ENDIFDEF[\\s\\S]*?-->','g'), '')
			)
	)
)

namespace('ometa', ->
	outFileList = []
	fileList = new jake.FileList()
	fileList.include('js/mylibs/**.ometa','js/mylibs/**.ojs')
	for inFile in fileList.toArray()
		outFile = inFile.replace(/\.(ojs|ometa)$/,'.js')
		outFileList.push(jake.currentNamespace.name + ':' + outFile)
		taskObj = {}
		taskObj[outFile] = inFile
		file(taskObj, do (inFile, outFile) -> ->
			require('./tools/ometac.js').compileOmeta(inFile, outFile, true)
		)
	desc('Build all OMeta files')
	task('all': outFileList, ->)
)
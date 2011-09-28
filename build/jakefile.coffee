process.chdir('..')
process.env.buildDir ?= 'bin'

fs = require('fs')

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
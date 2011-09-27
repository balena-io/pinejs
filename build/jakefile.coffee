namespace('ometa', ->
	outFileList = []
	fileList = new jake.FileList()
	fileList.include('../js/mylibs/**.ometa','../js/mylibs/**.ojs')
	for inFile in fileList.toArray()
		outFile = inFile.replace(/\.(ojs|ometa)$/,'.js')
		outFileList.push(jake.currentNamespace.name + ':' + outFile)
		taskObj = {}
		taskObj[outFile] = inFile
		file(taskObj, do (inFile, outFile) -> ->
			require('./tools/ometac.js').compileOmeta(inFile, outFile, true)
		)
	task('all': outFileList, ->)
)
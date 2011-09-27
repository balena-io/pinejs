fs = require('fs')

findFiles = (dirName,endings = ['']) ->
	filesFound = []
	files = fs.readdirSync(dirName)
	for file in files
		file = dirName + "/" + file
		fStats = fs.statSync(file)
		if fStats.isFile()
			for ending in endings
				if file[file.length-ending.length..] == ending
					filesFound.push(file)
					break
		else if fStats.isDirectory()
			filesFound = filesFound.concat(findFiles(file, endings))
	return filesFound

desc('Build ometa files.')
task('ometa', [], () ->
	ometaEndings = ['.ometa','.ojs']
	console.log("Building ometa files")
	compileOmeta = require('./tools/ometac.js').compileOmeta
	for file in findFiles('../js/mylibs', ometaEndings)
		compileOmeta(file, file.substring(0, file.lastIndexOf(".")) + '.js', true)
)
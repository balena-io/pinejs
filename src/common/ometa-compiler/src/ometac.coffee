fs = require('fs')
vm = require('vm')
load = (filePath) ->
	vm.runInThisContext(fs.readFileSync(filePath, 'utf8'), __filename)

ometajs = require('../../../external/ometa-js/lib/ometajs.js')
UglifyJS = require('uglifyjs')

calculateLineColInfo = (string, index) ->
	line = 1
	column = 0
	for char in string[..index]
		column++
		if char == '\n'
			line++
			column = 0
	return {line, column}
	console.log('Line:', line)
	console.log('Col:', column)

translationError = (m, i) ->
	console.log('Translation error - please report this!')
	throw fail
parsingError = (ometa) ->
	(m, i) ->
		{line, column} = calculateLineColInfo(ometa, i)
		start = Math.max(0, i - 20)
		console.log('Error on line ' + line + ', column ' + column)
		console.log('Error around: ' + ometa.substring(start, Math.min(ometa.length, start + 40)))
		console.log('Error around: ' + ometa.substring(i - 2, Math.min(ometa.length, i + 2)))
		throw m

compileOmeta = (ometa, pretty, desc = 'OMeta') ->
	try
		console.log('Parsing: ' + desc)
		tree = ometajs.BSOMetaJSParser.matchAll(ometa, 'topLevel', undefined, parsingError(ometa))
		console.log('Compiling: ' + desc)
		js = ometajs.BSOMetaJSTranslator.match(tree, 'trans', undefined, translationError)
		ast = UglifyJS.parse(js)
		ast.figure_out_scope()
		ast = ast.transform(compressor)
		js = ast.print_to_string(
			beautify: pretty == true
		)
		return js
	catch e
		# console.log(e)
		return false

compileOmetaFile = (ometaFilePath, jsFilePath, pretty, callback) ->
	console.log('Reading: ' + ometaFilePath)
	fs.readFile(ometaFilePath, 'utf8', do (ometaFilePath) ->
		(err, data) ->
			if err
				console.log(err)
				callback(true)
			else
				ometa = data.replace(/\r\n/g, '\n')
				js = compileOmeta(ometa, pretty, ometaFilePath)
				if js == false
					callback(true)
				else
					console.log('Writing: ' + ometaFilePath)
					fs.writeFile(jsFilePath, js, () ->
						console.log('Finished: ' + ometaFilePath)
						callback(false)
					)
	)


if process.argv[1] == __filename
	nopt = require('nopt')
	knownOpts =
		'pretty': Boolean
		'watch': Boolean
	shortHands = 
		'-p': ['--pretty']
		'-w': ['--watch']
	parsed = nopt(knownOpts, shortHands, process.argv, 2)
	doCompile = (filePath) ->
		compileOmetaFile(filePath, filePath.substring(0, filePath.lastIndexOf('.')) + '.js', parsed.pretty)
	for filePath in parsed.argv.remain
		doCompile(filePath)
		if parsed.watch
			do (filePath) ->
				fs.watch(filePath).on('change', (event, filename) ->
					doCompile(filePath)
				)
		


exports?.compileOmetaFile = compileOmetaFile
exports?.compileOmeta = compileOmeta
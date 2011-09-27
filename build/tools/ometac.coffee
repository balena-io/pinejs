console = require("console")
fs = require("fs")
vm = require("vm")
load = (filePath) ->
	vm.runInThisContext fs.readFileSync(filePath, "utf8"), __filename

load(__dirname + "/../../ometa-js/lib.js")
load(__dirname + "/../../ometa-js/ometa-base.js")
load(__dirname + "/../../ometa-js/parser.js")
load(__dirname + "/../../ometa-js/bs-js-compiler.js")
load(__dirname + "/../../ometa-js/bs-ometa-compiler.js")
load(__dirname + "/../../ometa-js/bs-ometa-optimizer.js")
load(__dirname + "/../../ometa-js/bs-ometa-js-compiler.js")
load(__dirname + "/../../ometa-dev/js/beautify.js")

translationError = (m, i) ->
	console.log "Translation error - please tell Alex about this!"
	throw fail
parsingError = (ometa) ->
	(m, i) ->
		start = Math.max(0, i - 20)
		console.log "Error around: " + ometa.substring(start, Math.min(ometa.length, start + 40))
		console.log "Error around: " + ometa.substring(i - 2, Math.min(ometa.length, i + 2))
		throw m

compileOmeta = (ometaFilePath, jsFilePath, pretty) ->
	console.log("Reading: " + ometaFilePath)
	fs.readFile ometaFilePath, "utf8", do (ometaFilePath) ->
		(err, data) ->
			if err
				console.log(err)
			else
				ometa = data.replace(/\r\n/g, "\n")
				console.log("Parsing: " + ometaFilePath)
				tree = BSOMetaJSParser.matchAll(ometa, "topLevel", undefined, parsingError(ometa))
				console.log("Compiling: " + ometaFilePath)
				js = BSOMetaJSTranslator.match(tree, "trans", undefined, translationError)
				if pretty == true
					console.log("Beautifying: " + ometaFilePath)
					js = js_beautify(js)
				console.log("Writing: " + ometaFilePath)
				fs.writeFile(jsFilePath, js)


if(process.argv[1] == __filename)
	arguments = process.argv[2..]
	ometaPath = arguments[0]
	if((pretty = arguments[0] == "pretty") == true)
		arguments.shift()
	for filePath in arguments
		compileOmeta(filePath, filePath.substring(0, filePath.lastIndexOf(".")) + ".js", pretty)


exports?.compileOmeta = compileOmeta
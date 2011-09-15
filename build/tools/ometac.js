if (typeof process !== 'undefined') {
	var console = require('console');
	
	var fs = require('fs');
	readFile = function(filePath) {
		return fs.readFileSync(filePath,'utf8');
	}
	readFileAsync = function(filePath, callback) {
		fs.readFile(filePath,'utf8',callback);
	}
	writeFile = function(filePath, data) {
		return fs.writeFile(filePath,data);
	}
	
	var vm = require('vm');
	load = function (filePath) {
			return vm.runInThisContext(readFile(filePath), __filename);
		};
	
	arguments = process.argv;
	arguments.shift();
	arguments.shift();
}
else {
	var console = {
		log: function() {
			print.apply(undefined, arguments);
		}
	}
	readFileAsync = function(filePath, callback) {
		callback(undefined,readFile(filePath));
	}
	writeFile = function(filePath, data) {
		var fw = new java.io.FileWriter(filePath,false);
		fw.write(data);
		fw.flush();
		fw.close();
	}
}

var ometaPath = arguments[0];
load(ometaPath+"/lib.js")
load(ometaPath+"/ometa-base.js")
load(ometaPath+"/parser.js")
load(ometaPath+"/bs-js-compiler.js")
load(ometaPath+"/bs-ometa-compiler.js")
load(ometaPath+"/bs-ometa-optimizer.js")
load(ometaPath+"/bs-ometa-js-compiler.js")

load(ometaPath+"/../ometa-dev/js/beautify.js")

var translationError = function(m, i) { 
	console.log("Translation error - please tell Alex about this!"); throw fail 
};
var parsingError = function(ometa) {
	return function(m, i) {
//		console.log(m);
		var start = Math.max(0,i-20);
		console.log('Error around: '+ometa.substring(start, Math.min(ometa.length,start+40)));
		console.log('Error around: '+ometa.substring(i-2, Math.min(ometa.length,i+2)));
		throw m;
	}
}
	
var i=1, pretty = false;
if(arguments[1]=='pretty') {
	pretty = true;
	i++;
}

for(;i<arguments.length;i++) {
	console.log('Reading: ' + arguments[i]);
	readFileAsync(arguments[i], function(filePath){
			return function(err, data) {
				var ometa = data.replace(/\r\n/g,"\n");
				console.log('Parsing: ' + filePath);
				var tree = BSOMetaJSParser.matchAll(ometa, "topLevel", undefined, parsingError(ometa))
				console.log('Compiling: ' + filePath);
				var js = BSOMetaJSTranslator.match(tree, "trans", undefined, translationError);
				if(pretty===true) {
					console.log('Beautifying: ' + filePath);
					var js = js_beautify(js);
				}
				console.log('Writing: ' + filePath);
				writeFile(filePath.substring(0,filePath.lastIndexOf('.'))+'.js', js);
			}
		}(arguments[i])
	);
}
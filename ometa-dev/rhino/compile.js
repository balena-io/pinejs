load("../../js/mylibs/ometa-js/lib.js")
load("../../js/mylibs/ometa-js/ometa-base.js")
load("../../js/mylibs/ometa-js/parser.js")
load("../../js/mylibs/ometa-js/bs-js-compiler.js")
load("../../js/mylibs/ometa-js/bs-ometa-compiler.js")
load("../../js/mylibs/ometa-js/bs-ometa-optimizer.js")
load("../../js/mylibs/ometa-js/bs-ometa-js-compiler.js")

load("../js/beautify.js")

var console = {
	log: function(val) {
		print(val);
	}
}

var translationError = function(m, i) { 
	console.log("Translation error - please tell Alex about this!"); throw fail 
};
var parsingError = function(m, i) {
	console.log(m);
	var start = Math.max(0,i-20);
	console.log('Error around: '+ometa.substring(start, Math.min(ometa.length,start+40)));
	console.log('Error around: '+ometa.substring(i-2, Math.min(ometa.length,i+2)));
	throw m;
}

var i=0, pretty = false;
if(arguments[0]=='pretty') {
	pretty = true;
	i++;
}

for(;i<arguments.length;i++) {
	console.log('Reading: ' + arguments[i]);
	var ometa = readFile(arguments[i]).replace(/\r\n/g,"\n");
	console.log('Parsing: ' + arguments[i]);
	var tree = BSOMetaJSParser.matchAll(ometa, "topLevel", undefined, parsingError)
	console.log('Compiling: ' + arguments[i]);
	var js = BSOMetaJSTranslator.match(tree, "trans", undefined, translationError);
	if(pretty===true) {
		console.log('Beautifying: ' + arguments[i]);
		var js = js_beautify(js);
	}
	console.log('Writing: ' + arguments[i]);
	var fw = new java.io.FileWriter(arguments[i].substring(0,arguments[i].lastIndexOf('.'))+'.js',false);
	fw.write(js);
	fw.flush();
	fw.close();
}
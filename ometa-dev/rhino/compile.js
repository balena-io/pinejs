load("../../ometa-js/lib.js")
load("../../ometa-js/ometa-base.js")
load("../../ometa-js/parser.js")
load("../../ometa-js/bs-js-compiler.js")
load("../../ometa-js/bs-ometa-compiler.js")
load("../../ometa-js/bs-ometa-optimizer.js")
load("../../ometa-js/bs-ometa-js-compiler.js")

load("../js/beautify.js")

var translationError = function(m, i) { 
	alert("Translation error - please tell Alex about this!"); throw fail 
};
var parsingError = function(m, i) {
	print(m);
	var start = Math.max(0,i-20);
	print('Error around: '+ometa.substring(start, Math.min(ometa.length,start+40)));
	print('Error around: '+ometa.substring(i-2, Math.min(ometa.length,i+2)));
	throw m;
}

var i=0, pretty = false;
if(arguments[0]=='pretty') {
	pretty = true;
	i++;
}

for(;i<arguments.length;i++) {
	print('Reading: ' + arguments[i]);
	var ometa = readFile(arguments[i]).replace(/\r\n/g,"\n");
	print('Parsing: ' + arguments[i]);
	var tree = BSOMetaJSParser.matchAll(ometa, "topLevel", undefined, parsingError)
	print('Compiling: ' + arguments[i]);
	var js = BSOMetaJSTranslator.match(tree, "trans", undefined, translationError);
	if(pretty===true) {
		print('Beautifying: ' + arguments[i]);
		var js = js_beautify(js);
	}
	print('Writing: ' + arguments[i]);
	var fw = new java.io.FileWriter(arguments[i].substring(0,arguments[i].lastIndexOf('.'))+'.js',false);
	fw.write(js);
	fw.flush();
	fw.close();
}
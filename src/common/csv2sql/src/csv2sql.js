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

var tableName = arguments[0];
for(var i=1;i<arguments.length;i++) {
	console.log('Reading: ' + arguments[i]);
	readFileAsync(arguments[i], function(filePath){
			return function(err, data) {
				console.log('Parsing: ' + filePath);
				data = data.replace(/^.*$/m,""); //Delete first line
				data = data.replace(/'/g,"''"); //Escape quotes
				data = data.replace(/^"/gm,"INSERT INTO "+tableName+" VALUES ('");
				data = data.replace(/"$/gm,"');");
				data = data.replace(/","/gm,"','"); // " = "" in CSV
				console.log('Writing: ' + filePath);
				writeFile(filePath.substring(0,filePath.lastIndexOf('.'))+'.sql', data);
			}
		}(arguments[i])
	);
}
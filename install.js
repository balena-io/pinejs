// This install script is used to work around the issue that the dependencies of a private git repo do not get installed on an npm install, so it makes sure they are installed before trying to build.

var dependencies = require('./package.json').dependencies,
	childProcess = require('child_process'),
	dependenciesKeys = Object.keys(dependencies),
	windows = require('os').platform() == 'win32';

checkDependency(0);

function checkDependency(i) {
	if(i === dependenciesKeys.length) {
		return cleanup();
	}
	var dependency = dependenciesKeys[i];
	// Workaround for bcrypt being insanely hard to get building on windows.
	if(windows && dependency == 'bcrypt') {
		return checkDependency(i+1);
	}
	try {
		require(dependency);
		checkDependency(i+1);
	} catch (e) {
		var command = 'npm install ' + dependency + '@' + dependencies[dependency];
		console.log(command);
		childProcess.exec(command, {}, function(err, stdout, stderr) {
			if(err) {
				console.error(err);
				process.exit(1);
			}
			checkDependency(i+1);
		});
	}
}

function cleanup() {
	var command = 'node node_modules/requirejs/bin/r.js -o src/server/build/server.build.js out=pine.js';
	console.log(command);
	childProcess.exec(command, {}, function(err, stdout, stderr) {
		if(err) {
			console.error(err);
			process.exit(1);
		}
		process.exit(0);
	});
}
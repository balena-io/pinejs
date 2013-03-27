var dependencies = require('./package.json').dependencies,
	childProcess = require('child_process'),
	dependenciesRemaining = Object.keys(dependencies).length,
	windows = require('os').platform() == 'win32';
for(dependency in dependencies) {
	// Workaround for bcrypt being insanely hard to get building on windows.
	if(windows && dependency == 'bcrypt') {
		dependenciesRemaining--;
		continue;
	}
	var command = 'npm install ' + dependency + '@' + dependencies[dependency];
	console.log(command);
	childProcess.exec(command, {}, function(err, stdout, stderr) {
		if(err) {
			console.error(err);
			process.exit(1);
		}
		dependenciesRemaining--;
		if(dependenciesRemaining == 0) {
			var command = 'node node_modules/requirejs/bin/r.js -o src/server/build/server.build.js';
			console.log(command);
			childProcess.exec(command, {}, function(err, stdout, stderr) {
				if(err) {
					console.error(err);
					process.exit(1);
				}
				process.exit(0);
			});
		}
	});
}
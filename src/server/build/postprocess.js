var semver = require('semver');

function testDependencies(installedPackages, dependencies) {
	var depsOk = true;
	for(var packageName in dependencies) {
		if(installedPackages[packageName]) {
			var installedVersion = installedPackages[packageName].version;
			// Trim the `git+ssh://git@bitbucket.org:rulemotion/abstract-sql-compiler.git#v` part from our git dependencies
			var expectedVersion = dependencies[packageName].replace(/.*\.git#v/, '')

			if(!semver.satisfies(installedVersion, expectedVersion)) {
				console.error('Installed dependencies for "' + packageName + '" do not match package.json, installed: "' + installedVersion + '", expected: "' + expectedVersion + '", please npm install.')
				depsOk = false;
			}
		}
		else {
			console.error(packageName + ' is not installed, please npm install.');
			depsOk = false;
		}
	}
	return depsOk;
}

module.exports = function(text) {
	var buildDir = '.',
		hasConfig = JSON.stringify(this.has, null, '\t'),
		childProcess = require('child_process');
	childProcess.exec('npm list --json', function(err, stdout, stderr) {
		if(err) {
			console.error(err);
			throw err;
		}
		var installedPackages = JSON.parse(stdout).dependencies;
		var pkg = require(buildDir + '/../../../package.json');
		var depsOk = testDependencies(installedPackages, pkg.dependencies);
		var devDepsOk = testDependencies(installedPackages, pkg.devDependencies);

		if(!depsOk || !devDepsOk) {
			console.error('Please fix dependency errors and try again');
			process.exit(1);
		}
		childProcess.exec('git describe --tags', {
			cwd: buildDir
		}, function(err, stdout, stderr) {
			if(err) {
				console.error(err);
				throw err;
			}
			childProcess.exec('git diff --exit-code', {
				cwd: buildDir
			}, function(err) {
				var workingDirChangeSignifier = '';
				if(err) {
					// There are working dir changes.
					workingDirChangeSignifier = '+';
				}
				text = '// Build: ' + stdout.trim() + workingDirChangeSignifier + '\n' +
						'/* has: ' + hasConfig + ' */\n' +
					text;
				require('fs').writeFile(buildDir + '/pine.js', text, function(err) {
					if(err) {
						console.error(err);
						throw err;
					}
				});
			});
		});
	});
};
({
	out: function(text) {
		var buildDir = this.baseUrl + '../build',
			hasConfig = JSON.stringify(this.has, null, '\t'),
			childProcess = nodeRequire('child_process');
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
				nodeRequire('fs').writeFile(buildDir + '/platform.js', text, function(err) {
					if(err) {
						console.error(err);
						throw err;
					}
				});
			});
		});
	},

	stubModules: [
		'text',
		'css', 
		'cs',
		'ometa'
	],
	excludeShallow: [
		'cache',
		'coffee-script',
		'css/normalize', 'css/css',
		'ometa-parsers', 'uglify-js'
	],
	preserveLicenseComments: false,
	mainConfigFile: '../src/main.js',

	optimize: 'uglify2',
	uglify2: {
		output: {
			beautify: true,
			ascii_only: true
		},
		compress: {
			sequences: false,
			unused: false // We need this off for OMeta
		},
		mangle: false
	},

	has: {
		ENV_NODEJS				: false,
		ENV_BROWSER				: true,
		SBVR_EXTENSIONS			: true,
		SBVR_SERVER_ENABLED		: true,
		DEV						: true,

		CONFIG_LOADER			: false
	},

	paths: {
		underscore: '../../underscore/underscore',
		async: '../../async/lib/async'
	},

	name: 'cs!server-glue/server'
})

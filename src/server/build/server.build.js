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
	wrap: {
		start: "(function() { var define = require('requirejs').define;",
		end: "}());require('requirejs')('cs!server-glue/server');"
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
		'ometa-parsers', 'uglifyjs'
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
		ENV_NODEJS				: true,
		ENV_BROWSER				: false,
		SBVR_EXTENSIONS			: true,
		SBVR_SERVER_ENABLED		: false,
		USE_MYSQL				: true,
		USE_POSTGRES			: false,
		DEV						: false,

		CONFIG_LOADER			: true
	},

	paths: {
		underscore: 'empty:',
		async: 'empty:'
	},
	name: 'cs!server-glue/server'
})

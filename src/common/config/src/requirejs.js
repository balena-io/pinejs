if(typeof DEV === 'undefined') DEV = true;
(function() {
	var scripts = document.getElementsByTagName('script'),
		uriParts = scripts[scripts.length - 1].src.split('/'),
		rootPath, i, partsToPop;
	if(DEV) {
		partsToPop = 4;
	}
	else {
		partsToPop = 3;
	}
	for(i=0;i<partsToPop;i++) {
		uriParts.pop();
	}
	rootPath = uriParts.join('/') + '/';
	delete scripts;
	delete uriParts;
	
	var currentPathParts = location.pathname.split('/');
	currentPathParts.pop(); // Remove filename
	var buildType = '';
	if(DEV) {
		buildType = '/' + currentPathParts.pop();
		if(buildType != '/src') {
			buildType = '/' + currentPathParts.pop() + buildType;
		}
	}

	window.requireCSS = (function() {
		var paths = {
			'jquery-ui':				rootPath + 'external/jquery-ui/css/ui-lightness/jquery-ui',
			'codemirror':				rootPath + 'external/CodeMirror2/lib/codemirror',
			'codemirror-util':			rootPath + 'external/CodeMirror2/lib/util',
			'codemirror-theme':			rootPath + 'external/CodeMirror2/theme',
			'qunit':					rootPath + 'external/qunit/qunit',
			'codemirror-ometa-bridge':	rootPath + 'client/codemirror-ometa-bridge' + buildType
		};
		return function(url) {
			var firstPathPart = url.split('/')[0];
			if (paths.hasOwnProperty(firstPathPart)) {
				url = url.replace(firstPathPart, paths[firstPathPart]) + '.css';
			}
			var link = document.createElement("link");
			link.type = "text/css";
			link.rel = "stylesheet";
			link.href = url;
			document.getElementsByTagName("head")[0].appendChild(link);
		}
	})();

	requireCSS('jquery-ui');
	requirejs({
		paths: {
			'jquery':					rootPath + 'external/jquery-1.7.1.min',
			// 'jquery':					'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min',
			'jquery-ui':				rootPath + 'external/jquery-ui/js/jquery-ui-1.8.17.custom.min',
			'jquery-custom-file-input':	rootPath + 'external/jquery-custom-file-input',
			'jquery.hotkeys':			rootPath + 'external/jquery.hotkeys',
			'ometa-core':				rootPath + 'external/ometa-js/lib/ometajs/core',
			'ometa-compiler':			rootPath + 'external/ometa-js/lib/ometajs/ometa/parsers',
			'codemirror':				rootPath + 'external/CodeMirror2/lib/codemirror',
			'codemirror-util':			rootPath + 'external/CodeMirror2/lib/util',
			'codemirror-keymap':		rootPath + 'external/CodeMirror2/keymap',
			'codemirror-modes':			rootPath + 'external/CodeMirror2/mode',
			'js-beautify':				rootPath + 'external/beautify/beautify',
			'qunit':					rootPath + 'external/qunit/qunit',
			'underscore':				rootPath + 'external/underscore/underscore.min',
			'inflection':				rootPath + 'external/inflection/inflection',
			'json2':					rootPath + 'external/json2',
			'downloadify':				rootPath + 'external/downloadify',
			'ejs':						rootPath + 'external/ejs/ejs.min',
			
			'sbvr-parser':				rootPath + 'common/sbvr-parser' + buildType,
			'utils':					rootPath + 'common/utils' + buildType,
			
			'sbvr-frame':				rootPath + 'client/sbvr-frame' + buildType,
			'data-frame':				rootPath + 'client/data-frame' + buildType,
			'Prettify':					rootPath + 'client/prettify-ometa' + buildType + '/Prettify',
			'codemirror-ometa-bridge':	rootPath + 'client/codemirror-ometa-bridge' + buildType,
			
			'sbvr-compiler':			rootPath + 'server/sbvr-compiler' + buildType,
			
			'server-glue':				rootPath + 'server/server-glue' + buildType,
			'express-emulator':			rootPath + 'server/express-emulator' + buildType,
			'data-server':				rootPath + 'server/data-server' + buildType,
			'editor-server':			rootPath + 'server/editor-server' + buildType,
			'database-layer':			rootPath + 'server/database-layer' + buildType,
			'passportBCrypt':			rootPath + 'server/passport-bcrypt' + buildType + '/passportBCrypt',
			
			'frame-glue':				rootPath + 'client/frame-glue' + buildType
		},
		priority: ['jquery']
	}, ['jquery-ui',
		'jquery-custom-file-input',
		'json2']);
})()
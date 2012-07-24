(function() {
	var scripts = document.getElementsByTagName('script'),
		uriParts = scripts[scripts.length - 1].src.split('/'),
		rootPath, i=0;
	for(;i<3;i++) {
		uriParts.pop();
	}
	rootPath = uriParts.join('/') + '/';
	delete scripts;
	delete uriParts;

	window.requireCSS = (function() {
		var paths = {
			'jquery-ui':				rootPath + 'external/jquery-ui/css/ui-lightness/jquery-ui.css',
			'codemirror':				rootPath + 'external/CodeMirror2/lib/codemirror.css',
			'codemirror-util':			rootPath + 'external/CodeMirror2/lib/util',
			'codemirror-theme':			rootPath + 'external/CodeMirror2/theme',
			'qunit':					rootPath + 'external/qunit/qunit.css',
			'codemirror-ometa-bridge':	rootPath + 'client/codemirror-ometa-bridge/src/sbvr.css'
		};
		return function(url) {
			var firstPathPart = url.split('/')[0];
			if (paths.hasOwnProperty(firstPathPart)) {
				url = url.replace(firstPathPart, paths[firstPathPart]);
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
			// jquery:						rootPath + 'external/jquery-1.7.1.min'
			'jquery':					'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min',
			'jquery-ui':				rootPath + 'external/jquery-ui/js/jquery-ui-1.8.17.custom.min',
			'jquery-custom-file-input':	rootPath + 'external/jquery-custom-file-input',
			'jquery.hotkeys':			rootPath + 'external/jquery.hotkeys',
			'ometa':					rootPath + 'external/ometa-js',
			'codemirror':				rootPath + 'external/CodeMirror2/lib/codemirror',
			'codemirror-util':			rootPath + 'external/CodeMirror2/lib/util',
			'codemirror-modes':			rootPath + 'external/CodeMirror2/mode',
			'js-beautify':				rootPath + 'external/beautify/beautify',
			'qunit':					rootPath + 'external/qunit/qunit',
			'underscore':				rootPath + 'external/underscore-1.2.1.min',
			'inflection':				rootPath + 'external/inflection/inflection',
			'json2':					rootPath + 'external/json2',
			'downloadify':				rootPath + 'external/downloadify',
			'ejs':						rootPath + 'external/ejs/ejs.min',
			
			'sbvr-parser':				rootPath + 'common/sbvr-parser/src/',
			'utils':					rootPath + 'common/utils/src/',
			
			'sbvr-frame':				rootPath + 'client/sbvr-frame/src',
			'data-frame':				rootPath + 'client/data-frame/src',
			'Prettify':					rootPath + 'client/prettify-ometa/src/Prettify',
			'codemirror-ometa-bridge':	rootPath + 'client/codemirror-ometa-bridge/src',
			
			'sbvr-compiler':			rootPath + 'server/sbvr-compiler/src/',
			
			'server-glue':				rootPath + 'server/server-glue/src/server',
			'express-emulator':			rootPath + 'server/express-emulator/src/express',
			'data-server':				rootPath + 'server/data-server/src',
			'editorServer':				rootPath + 'server/editor-server/src/editorServer',
			'database-layer':			rootPath + 'server/database-layer/src/',
			'passportBCrypt':			rootPath + 'server/passport-bcrypt/src/passportBCrypt'
		},
		priority: ['jquery']
	}, ['jquery-ui',
		'jquery-custom-file-input',
		'json2']);
})()
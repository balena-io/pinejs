(function() {
	var rootPath = 'file://D:/Projects/startup/mondat-canvas/src/'; //WARNING: This is dependant upon local folder structure, could do with a better way of doing this.
	
	window.requireCSS = (function() {
		var paths = {
			'jquery-ui':		rootPath + 'external/jquery-ui/css/ui-lightness/jquery-ui.css',
			'codemirror':		rootPath + 'external/CodeMirror2/lib/codemirror.css',
			'codemirror-theme':	rootPath + 'external/CodeMirror2/theme',
			'qunit':			rootPath + 'external/qunit/qunit.css'
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
			'ometa-base':				rootPath + 'external/ometa-js/ometa-base',
			'codemirror':				rootPath + 'external/CodeMirror2/lib/codemirror',
			'codemirror-modes':			rootPath + 'external/CodeMirror2/mode',
			'SBVRParser':				rootPath + 'common/SBVRParser/src/SBVRParser',
			'SBVR2SQL':					rootPath + 'server/sbvr-compiler/src/SBVR2SQL',
			'SBVR_PreProc':				rootPath + 'server/sbvr-compiler/src/SBVR_PreProc',
			'sbvr-frame':				rootPath + 'client/SBVR-frame/src',
			'data-frame':				rootPath + 'client/data-frame/src',
			'js-beautify':				rootPath + 'external/beautify/beautify',
			'qunit':					rootPath + 'external/qunit/qunit',
			'underscore':				rootPath + 'external/underscore-1.2.1.min',
			'inflection':				rootPath + 'external/inflection/inflection',
			'server-glue':				rootPath + 'server/server-glue/src/server',
			'express-emulator':			rootPath + 'server/express-emulator/src/express',
			'data-server':				rootPath + 'server/data-server/src',
			'editorServer':				rootPath + 'server/editor-server/src/editorServer',
			'database-layer':			rootPath + 'server/database-layer/src/'
		},
		priority: ['jquery']
	}, ['jquery-ui',
		'jquery-custom-file-input']);
})()
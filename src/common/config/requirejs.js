requireCSS = (function() {
	var paths = {
		'jquery-ui': 'file://D:/Development/Ometa/rulemotion-canvas/src/external/jquery-ui/css/ui-lightness/jquery-ui.css',
		'codemirror': 'file://D:/Development/Ometa/rulemotion-canvas/src/external/CodeMirror2/lib/codemirror.css',
		'codemirror-theme': 'file://D:/Development/Ometa/rulemotion-canvas/src/external/CodeMirror2/theme',
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

(function() {
	var rootPath = '/'; //WARNING: This is dependant upon local folder structure, could do with a better way of doing this.
	requireCSS('jquery-ui');
	requirejs({
		paths: {
			// jquery:						rootPath + 'external/jquery-1.7.1.min'
			jquery:						'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min',
			'jquery-ui':				rootPath + 'external/jquery-ui/js/jquery-ui-1.8.17.custom.min',
			'jquery-custom-file-input':	rootPath + 'external/jquery-custom-file-input',
			'jquery.hotkeys':			rootPath + 'external/jquery.hotkeys',
			ometa:						rootPath + 'external/ometa-js',
			'ometa-base':				rootPath + 'external/ometa-js/ometa-base',
			codemirror:					rootPath + 'external/CodeMirror2/lib/codemirror',
			'codemirror-modes':			rootPath + 'external/CodeMirror2/mode',
			'js-beautify':				rootPath + 'external/beautify/beautify'
		},
		priority: ['jquery']
	}, ['jquery-ui',
		'jquery-custom-file-input']);
})()
requireCSS = (function() {
	var paths = {
		'jquery-ui'			: 'external/jquery-ui/css/ui-lightness/jquery-ui-1.9.0.custom',
		'codemirror'		: 'external/CodeMirror2/lib/codemirror',
		'codemirror-util'	: 'external/CodeMirror2/lib/util',
		'codemirror-theme'	: 'external/CodeMirror2/theme',
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

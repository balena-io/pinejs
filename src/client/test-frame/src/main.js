requireCSS('qunit');
requirejs(['qunit'], function() {
	requirejs(['sbvr.js', 'server.js']);//, 'ClientURI.js']);
});
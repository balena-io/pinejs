define(function() {
	return function(id, value) {
		var html = '<input type="number" id="' + id + '"';
		if(value!=undefined) {
			html += ' value="' + value + '"';
		}
		return html + ' />';
	}
});
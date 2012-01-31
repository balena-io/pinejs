define(function() {
	return function(id, value) {
		var html = '<textarea id="' + id + '">';
		if(value!=undefined) {
			html += value;
		}
		return html + '</textarea>';
	}
});
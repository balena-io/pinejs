define(function() {
	var view = function(id, value) {
		return value;
	};
	var edit = function(id, value) {
		var html = '<textarea id="' + id + '">';
		if(value!=undefined) {
			html += value;
		}
		return html + '</textarea>';
	};
	return function(action, id, value) {
		var html;
		switch(action) {
			case 'view':
				return view(id, value);
			break;
			default:
				return edit(id, value);
		}
		return html;
	};
});
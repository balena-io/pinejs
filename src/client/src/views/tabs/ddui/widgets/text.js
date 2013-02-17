define(function() {
	var view = function(id, value) {
		return value;
	};
	var edit = function(id, value, nullable, onChange) {
		var html = '<input type="text" id="' + id + '"' + onChange;
		if(value!=undefined) {
			html += ' value="' + value + '"';
		}
		return html + ' />';
	};
	return function(action, id, value, nullable, onChange) {
		var html;
		switch(action) {
			case 'view':
				return view(id, value);
			break;
			default:
				return edit(id, value, nullable, onChange);
		}
		return html;
	};
});
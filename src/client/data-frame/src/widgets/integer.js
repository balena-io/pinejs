define(function() {
	var view = function(id, value) {
		return value;
	};
	var edit = function(id, value, anyNumber) {
		var html = '<input type="number" id="' + id + '"';
		if(value != undefined) {
			html += ' value="' + value + '"';
		}
		if(anyNumber === true) {
			html += ' step="any"';
		}
		return html + ' />';
	};
	return function(action, id, value, nullable, anyNumber) {
		var html;
		switch(action) {
			case 'view':
				return view(id, value);
			break;
			default:
				return edit(id, value, anyNumber != null && anyNumber);
		}
		return html;
	};
});
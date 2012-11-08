define(function() {
	var view = function(id, value) {
		return value;
	};
	var edit = function(id, value, nullable, onChange, anyNumber) {
		var html = '<input type="number" id="' + id + '"' + onChange;
		if(value != undefined) {
			html += ' value="' + value + '"';
		}
		if(anyNumber === true) {
			html += ' step="any"';
		}
		return html + ' />';
	};
	return function(action, id, value, nullable, onChange, anyNumber) {
		var html;
		switch(action) {
			case 'view':
				return view(id, value);
			break;
			default:
				return edit(id, value, nullable, onChange, anyNumber != null && anyNumber);
		}
		return html;
	};
});
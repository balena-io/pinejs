define(function() {
	var view = function(id, value, values) {
		var i = 0;
		for(id in values) {
			if(!values.hasOwnProperty(id)) {
				continue;
			}
			if(value == id) {
				// TODO: This should come from client model.
				return values[id].value;
			}
		}
		return value;
	};
	var edit = function(id, value, values) {
		var html = '<select id="' + id + '">',
			selected,
			id;
		for(id in values) {
			if(!values.hasOwnProperty(id)) {
				continue;
			}
			selected = '';
			if(value == id) {
				selected = ' selected="selected"';
			}
			// TODO: This should come from client model.
			html += '<option value="' + id + '"' + selected + '>' + values[id].value + '</option>';
		}
		return html + '</select>';
	};
	return function(action, id, value, values) {
		var html;
		switch(action) {
			case 'view':
				return view(id, value, values);
			break;
			default:
				return edit(id, value, values);
		}
		return html;
	};
});
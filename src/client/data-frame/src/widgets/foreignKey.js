define(function() {
	var view = function(id, value, values) {
		var i = 0;
		for(; i < values.length; i++) {
			if(value == values[i].id) {
				// TODO: This should come from client model.
				return values[i].value;
			}
		}
		return value;
	};
	var edit = function(id, value, values) {
		var html = '<select id="' + id + '">',
			selected,
			i = 0;
		for(; i < values.length; i++) {
			selected = '';
			if(value!=undefined && value == values[i].id) {
				selected = ' selected="selected"';
			}
			// TODO: This should come from client model.
			html += '<option value="' + values[i].id + '"' + selected + '>' + values[i].value + '</option>';
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
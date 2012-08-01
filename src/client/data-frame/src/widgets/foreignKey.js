define(function() {
	return function(id, values, value) {
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
	}
});
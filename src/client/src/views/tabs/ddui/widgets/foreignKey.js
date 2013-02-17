define(function() {
	var createSelectOption = function(optionID, optionValue, isSelected) {
		var selected = isSelected ? ' selected="selected"' : '';
		return '<option value="' + optionID + '"' + selected + '>' + optionValue + '</option>';
	},
	view = function(selectID, value, values) {
		var i = 0,
			optionID;
		for(optionID in values) {
			if(!values.hasOwnProperty(optionID)) {
				continue;
			}
			if(value == optionID) {
				// TODO: This should come from client model.
				return values[optionID].value == null ? values[optionID].name : values[optionID].value;
			}
		}
		return value;
	},
	edit = function(selectID, value, nullable, onChange, values) {
		var html = '<select id="' + selectID + '"' + onChange + '>',
			optionID,
			optionValue;
		if(nullable) {
			html += createSelectOption('', '', value == '');
		}
		for(optionID in values) {
			if(!values.hasOwnProperty(optionID)) {
				continue;
			}
			// TODO: This should come from client model.
			optionValue = values[optionID].value == null ? values[optionID].name : values[optionID].value;
			html += createSelectOption(optionID, optionValue, value == optionID);
		}
		return html + '</select>';
	};
	return function(action, id, value, nullable, onChange, values) {
		var html;
		value = value.__id;
		switch(action) {
			case 'view':
				return view(id, value, values);
			break;
			default:
				return edit(id, value, nullable, onChange, values);
		}
		return html;
	};
});
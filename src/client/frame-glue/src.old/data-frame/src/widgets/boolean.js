define(['data-frame/widgets/foreignKey'], function(foreignKey) {
	var booleanValues = {
		0: {
			id: 0,
			value: "false"
		}, 
		1: {
			id: 1,
			value: "true"
		}
	};
	return function(action, id, value) {
		return foreignKey(action, id, value, booleanValues);
	};
});
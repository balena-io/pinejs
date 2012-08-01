define(['data-frame/widgets/foreignKey'], function(foreignKey) {
	var booleanValues = [
		{
			id: 0,
			value: "false"
		}, {
			id: 1,
			value: "true"
		}
	];
	return function(id, value) {
		return foreignKey(id, booleanValues, value);
	}
});
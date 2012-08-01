define(['data-frame/widgets/inputForeignKey'], function(inputForeignKey) {
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
		return inputForeignKey(id, booleanValues, value);
	}
});
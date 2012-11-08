define(['data-frame/widgets/integer'], function(integer) {
	return function(action, id, value, nullable) {
		return integer(action, id, value, nullable, true);
	};
});
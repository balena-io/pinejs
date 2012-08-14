define(['data-frame/widgets/integer'], function(integer) {
	return function(action, id, value) {
		return integer(action, id, value, true);
	};
});
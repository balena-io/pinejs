define(['data-frame/widgets/integer'], function(integer) {
	return function(action, id, value, nullable, onChange) {
		return integer(action, id, value, nullable, onChange, true);
	};
});
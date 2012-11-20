define(['module'], function (module) {
	var config = module.config();
	return function (flag) {
		return config.hasOwnProperty(flag) && config[flag];
	};
});

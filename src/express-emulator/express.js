import * as _ from 'lodash';

/**
 * @typedef {Partial<Window> & {GLOBAL_PERMISSIONS?: string[]}} ExtendedWindow
 */

/** @type {ExtendedWindow} */
const w = typeof window !== 'undefined' && window !== null ? window : {};

w.GLOBAL_PERMISSIONS = ['resource.all'];

const app = (function () {
	/** @type Function */
	let ready;
	const enabled = new Promise((resolve) => {
		ready = resolve;
	});
	/** @type {{[key: string]: any}} */
	const appVars = { env: 'development' };
	/** @type {{[key: string]: any}} */
	const handlers = {
		// USE is a list of middleware to run before any request.
		USE: [],
		POST: [],
		PUT: [],
		DELETE: [],
		GET: [],
		PATCH: [],
		MERGE: [],
		OPTIONS: [],
	};
	const addHandler = function (
		/** @type string */ handlerName,
		/** @type {string} */ match,
		/** @type import('express').Handler[] */ ...middleware
	) {
		//Strip wildcard
		let paramName;
		match = match.toLowerCase();
		const newMatch = match.replace(/[\/\*]*$/, '');
		if (newMatch !== match) {
			match = newMatch;
			paramName = '*';
		} else {
			const paramMatch = /:(.*)$/.exec(match);
			paramName = paramMatch?.[1];
		}
		handlers[handlerName].push({
			match,
			paramName,
			// Flatten middleware list to handle arrays of middleware in the arg list.
			middleware: _.flattenDeep(middleware),
		});
	};
	const process = async function (
		/** @type string */ method,
		/** @type string */ uri,
		/** @type {{[key: string]: any}} */ headers,
		/** @type any */ body,
	) {
		if (body == null) {
			body = '';
		}
		if (!handlers[method]) {
			return Promise.reject([404, null, null]);
		}
		const req = {
			// Have a default user for in-browser with all permissions
			user: {
				permissions: w.GLOBAL_PERMISSIONS,
			},
			method,
			body,
			headers,
			url: uri,
			/** @type {{[key: string]: any}} */
			params: {},
			query: {},
			login(/** @type any */ _user, /** @type Function */ callback) {
				callback();
			},
		};
		console.log(method, uri, body);
		if (uri.slice(-1) === '/') {
			uri = uri.slice(0, uri.length - 1);
		}
		uri = uri.toLowerCase();
		return new Promise(function (resolve, reject) {
			const res = {
				statusCode: 200,
				status(/** @type number */ statusCode) {
					this.statusCode = statusCode;
					return this;
				},
				json(/** @type any */ obj) {
					// Stringify and parse to emulate passing over network.
					obj = JSON.parse(JSON.stringify(obj));
					if (this.statusCode >= 400) {
						reject([this.statusCode, obj, null]);
					} else {
						resolve([this.statusCode, obj, null]);
					}
				},
				send(/** @type any */ data) {
					data = _.cloneDeep(data);
					if (this.statusCode >= 400) {
						reject([this.statusCode, data, null]);
					} else {
						resolve([this.statusCode, data, null]);
					}
				},
				sendStatus(/** @type undefined | number */ statusCode) {
					if (statusCode == null) {
						({ statusCode } = this);
					}
					if (statusCode >= 400) {
						reject([statusCode, null, null]);
					} else {
						resolve([statusCode, null, null]);
					}
				},
				redirect() {
					reject([307]);
				},
				set() {
					// noop
				},
				type() {
					// noop
				},
			};

			const methodHandlers = handlers.USE.concat(handlers[method]);
			let i = -1;
			let j = -1;

			const next = function (/** @type {undefined | 'route'} */ route) {
				j++;
				if (route === 'route' || j >= methodHandlers[i].middleware.length) {
					checkMethodHandlers();
				} else {
					methodHandlers[i].middleware[j](req, res, next);
				}
			};
			const checkMethodHandlers = () => {
				i++;
				if (i < methodHandlers.length) {
					if (
						uri.slice(0, methodHandlers[i].match.length) ===
						methodHandlers[i].match
					) {
						j = -1;
						// Reset params that may have been added on previous routes that failed in middleware
						req.params = {};
						if (methodHandlers[i].paramName != null) {
							req.params[methodHandlers[i].paramName] = uri.slice(
								methodHandlers[i].match.length,
							);
							next();
						} else if (uri.length !== methodHandlers[i].match.length) {
							// Not an exact match and no parameter matching
							checkMethodHandlers();
						} else {
							next();
						}
					} else {
						checkMethodHandlers();
					}
				} else {
					res.sendStatus(404);
				}
			};
			checkMethodHandlers();
		});
	};
	return {
		use: _.partial(addHandler, 'USE', '/*'),
		get(/** @type string */ name) {
			const callback = arguments[arguments.length - 1];
			if (typeof callback === 'function') {
				addHandler('GET', ...arguments);
			} else {
				return appVars[name];
			}
		},
		post: _.partial(addHandler, 'POST'),
		put: _.partial(addHandler, 'PUT'),
		delete: _.partial(addHandler, 'DELETE'),
		patch: _.partial(addHandler, 'PATCH'),
		merge: _.partial(addHandler, 'MERGE'),
		options: _.partial(addHandler, 'OPTIONS'),
		all(/** @type any[] */ ...args) {
			this.post(...args);
			this.get(...args);
			this.put(...args);
			this.delete(...args);
		},
		process(/** @type any[] */ ...args) {
			// The promise will run the real process function asynchronously once the app is enabled,
			// which matches somewhat more closely to an AJAX call than doing it synchronously.
			return enabled.then(() => process(...args));
		},
		listen() {
			const callback = arguments[arguments.length - 1];
			ready();
			if (typeof callback === 'function') {
				return enabled.then(callback);
			}
		},
		set(/** @type string */ name, /** @type any */ value) {
			appVars[name] = value;
		},
	};
})();

const express = () => app;

module.exports = express;

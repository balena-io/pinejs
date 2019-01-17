import * as _ from 'lodash';
import { Store } from 'express-session';
import * as permissions from '../sbvr-api/permissions';
import { api, AnyObject } from '../sbvr-api/sbvr-utils';
import { Config } from '../config-loader/config-loader';

const sessionModel = `
	Vocabulary: session

	Term:       session id
		Concept Type: Short Text (Type)
	Term:       data
		Concept Type: JSON (Type)
	Term:       expiry time
		Concept type: Date Time (Type)

	Term:       session
		Database ID Field: session id
		Reference Scheme: session id

	Fact type:  session has data
		Necessity: Each session has exactly 1 data
	Fact type:  session has session id
		Necessity: Each session has exactly 1 session id
		Necessity: Each session id is of exactly 1 session
	Fact type:  session has expiry time
		Necessity: Each session has at most 1 expiry time
`;

export = class PinejsSessionStore extends Store {
	get = ((sid, callback) => {
		api.session
			.get({
				resource: 'session',
				id: sid,
				passthrough: {
					req: permissions.rootRead,
				},
				options: {
					$select: 'data',
				},
			})
			.then((session: AnyObject) => {
				if (session != null) {
					return session.data;
				}
			})
			.nodeify(callback);
	}) as Store['get'];

	set = ((sid, data, callback) => {
		const body = {
			session_id: sid,
			data: data,
			expiry_time: _.get(data, ['cookie', 'expires'], null),
		};
		api.session
			.put({
				resource: 'session',
				id: sid,
				passthrough: {
					req: permissions.root,
				},
				body,
			})
			.nodeify(callback);
	}) as Store['set'];

	destroy = ((sid, callback) => {
		api.session
			.delete({
				resource: 'session',
				id: sid,
				passthrough: {
					req: permissions.root,
				},
			})
			.nodeify(callback);
	}) as Store['destroy'];

	all = (callback => {
		api.session
			.get({
				resource: 'session',
				passthrough: {
					req: permissions.root,
				},
				options: {
					$select: 'session_id',
					$filter: {
						expiry_time: { $ge: Date.now() },
					},
				},
			})
			.then((sessions: AnyObject[]) => _.map(sessions, 'session_id'))
			.nodeify(callback);
	}) as Store['all'];

	clear = (callback => {
		// TODO: Use a truncate
		api.session
			.delete({
				resource: 'session',
				passthrough: {
					req: permissions.root,
				},
			})
			.nodeify(callback);
	}) as Store['clear'];

	length = (callback => {
		api.session
			.get({
				resource: 'session/$count',
				passthrough: {
					req: permissions.rootRead,
				},
				options: {
					$select: 'session_id',
					$filter: {
						expiry_time: {
							$ge: Date.now(),
						},
					},
				},
			})
			.nodeify(callback);
	}) as Store['length'];

	static config: Config = {
		models: [
			{
				modelName: 'session',
				modelText: sessionModel,
				apiRoot: 'session',
				logging: {
					default: false,
					error: true,
				},
			},
		],
	};
};

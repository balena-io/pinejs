import type { Config } from '../config-loader/config-loader';
import type { AnyObject } from '../sbvr-api/common-types';

import { Store } from 'express-session';
import * as permissions from '../sbvr-api/permissions';
import { api } from '../sbvr-api/sbvr-utils';

export { Store };

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

const asCallback = async <T>(
	callback: undefined | ((err: any, result?: T) => void),
	promise: Promise<T>,
) => {
	let err;
	let result;
	try {
		result = await promise;
	} catch ($err) {
		err = $err;
	}
	try {
		callback?.(err, result);
	} catch {
		// ignore errors in the callback
	}
};

export class PinejsSessionStore extends Store {
	public get = ((sid, callback) => {
		asCallback(
			callback,
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
				}),
		);
	}) as Store['get'];

	public set = ((sid, data, callback) => {
		const body = {
			session_id: sid,
			data,
			expiry_time: data?.cookie?.expires ?? null,
		};
		asCallback(
			callback,
			api.session.put({
				resource: 'session',
				id: sid,
				passthrough: {
					req: permissions.root,
				},
				body,
			}),
		);
	}) as Store['set'];

	public destroy = ((sid, callback) => {
		asCallback(
			callback,
			api.session.delete({
				resource: 'session',
				id: sid,
				passthrough: {
					req: permissions.root,
				},
			}),
		);
	}) as Store['destroy'];

	public all = ((callback) => {
		asCallback(
			callback,
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
				.then((sessions: AnyObject[]) => sessions.map((s) => s.session_id)),
		);
	}) as Store['all'];

	public clear = ((callback) => {
		asCallback(
			callback,
			// TODO: Use a truncate
			api.session.delete({
				resource: 'session',
				passthrough: {
					req: permissions.root,
				},
			}),
		);
	}) as Store['clear'];

	public length = ((callback) => {
		asCallback(
			callback,
			api.session.get({
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
			}) as Promise<number>,
		);
	}) as Store['length'];

	public static config: Config = {
		models: [
			{
				modelName: 'session',
				modelText: sessionModel,
				apiRoot: 'session',
				logging: {
					default: false,
					error: true,
				},
				migrations: {
					'11.0.0-modified-at': `
						ALTER TABLE "session"
						ADD COLUMN IF NOT EXISTS "modified at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;
					`,
				},
			},
		],
	};
}
